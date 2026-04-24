const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── CONFIG (fill in your real details) ──────────────────────────────────────
const USER_ID = 'johndoe_17091999';          // fullname_ddmmyyyy
const EMAIL_ID = 'john.doe@srmist.edu.in';   // your college email
const COLLEGE_ROLL = '21CS1001';             // your roll number
// ────────────────────────────────────────────────────────────────────────────

const VALID_EDGE = /^[A-Z]->[A-Z]$/;

function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (let raw of data) {
    const entry = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    // Validate format: must be X->Y, single uppercase letters, not self-loop
    if (!VALID_EDGE.test(entry) || entry[0] === entry[3]) {
      invalid_entries.push(raw);
      continue;
    }

    if (seenEdges.has(entry)) {
      // Only push once to duplicate_edges per unique duplicate
      if (!duplicate_edges.includes(entry)) duplicate_edges.push(entry);
    } else {
      seenEdges.add(entry);
      validEdges.push(entry);
    }
  }

  // Build adjacency: parent -> [children] (first-parent wins for multi-parent)
  const children = {};   // parent -> [child, ...]
  const parentOf = {};   // child -> parent (first parent wins)

  for (const edge of validEdges) {
    const [parent, child] = edge.split('->');
    if (parentOf[child] !== undefined) continue; // multi-parent: discard subsequent
    parentOf[child] = parent;
    if (!children[parent]) children[parent] = [];
    children[parent].push(child);
  }

  // All nodes
  const allNodes = new Set([
    ...Object.keys(children),
    ...Object.keys(parentOf),
  ]);

  // Find roots: nodes that never appear as a child
  const roots = [...allNodes].filter(n => parentOf[n] === undefined).sort();

  // Group nodes into connected components using union-find
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a, b) => { parent[find(a)] = find(b); };

  for (const edge of validEdges) {
    const [p, c] = edge.split('->');
    union(p, c);
  }

  // Group by component representative
  const components = {};
  for (const node of allNodes) {
    const rep = find(node);
    if (!components[rep]) components[rep] = new Set();
    components[rep].add(node);
  }

  // For each component, find its root(s)
  const hierarchies = [];

  for (const [rep, nodeSet] of Object.entries(components)) {
    const compNodes = [...nodeSet];
    const compRoots = compNodes.filter(n => parentOf[n] === undefined).sort();

    // Cycle detection: DFS from root(s) in the component
    const detectCycle = (startNodes) => {
      const visited = new Set();
      const stack = new Set();
      let hasCycle = false;

      const dfs = (node) => {
        if (stack.has(node)) { hasCycle = true; return; }
        if (visited.has(node)) return;
        visited.add(node);
        stack.add(node);
        for (const child of (children[node] || [])) {
          dfs(child);
        }
        stack.delete(node);
      };

      for (const r of startNodes) dfs(r);
      return hasCycle;
    };

    if (compRoots.length === 0) {
      // Pure cycle: use lex-smallest node as root
      const cycleRoot = compNodes.sort()[0];
      hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
      continue;
    }

    // Check for cycles within component from its roots
    const hasCycle = detectCycle(compRoots);

    if (hasCycle) {
      hierarchies.push({ root: compRoots[0], tree: {}, has_cycle: true });
      continue;
    }

    // Build nested tree object recursively
    const buildTree = (node) => {
      const obj = {};
      for (const child of (children[node] || [])) {
        obj[child] = buildTree(child);
      }
      return obj;
    };

    // Depth calculation
    const calcDepth = (node) => {
      const kids = children[node] || [];
      if (kids.length === 0) return 1;
      return 1 + Math.max(...kids.map(calcDepth));
    };

    // Handle multiple roots in a component (shouldn't happen with valid edges but be safe)
    for (const root of compRoots) {
      const tree = { [root]: buildTree(root) };
      const depth = calcDepth(root);
      hierarchies.push({ root, tree, depth });
    }
  }

  // Sort hierarchies: non-cyclic first (by depth desc), then cyclic
  // (keep original order for evaluator but put summary together)
  // Actually just sort by root lex for determinism
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // Summary
  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = '';
  if (nonCyclic.length > 0) {
    const maxDepth = Math.max(...nonCyclic.map(h => h.depth));
    const candidates = nonCyclic.filter(h => h.depth === maxDepth).map(h => h.root).sort();
    largest_tree_root = candidates[0];
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root,
  };

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary,
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '"data" must be an array of strings.' });
  }

  try {
    const result = processData(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'BFHL API running. POST /bfhl' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
