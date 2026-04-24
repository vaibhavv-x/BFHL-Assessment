const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIG (fill your details) =====
const USER_ID = 'vaibhav_22062005';   // fullname_ddmmyyyy
const EMAIL_ID = 'vaibhav_varikumar@srmist.edu.in';
const COLLEGE_ROLL = 'AP23110010425';

// ===== VALIDATION =====
const VALID_EDGE = /^[A-Z]->[A-Z]$/;

// ===== MAIN LOGIC =====
function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = [];

  for (let raw of data) {
    const entry = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    // invalid format or self-loop
    if (!VALID_EDGE.test(entry) || entry[0] === entry[3]) {
      invalid_entries.push(raw);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicate_edges.includes(entry)) duplicate_edges.push(entry);
    } else {
      seenEdges.add(entry);
      validEdges.push(entry);
    }
  }

  // adjacency
  const children = {};
  const parentOf = {};

  for (const edge of validEdges) {
    const [parent, child] = edge.split('->');

    if (parentOf[child] !== undefined) continue; // multi-parent discard

    parentOf[child] = parent;
    if (!children[parent]) children[parent] = [];
    children[parent].push(child);
  }

  // all nodes
  const allNodes = new Set([
    ...Object.keys(children),
    ...Object.keys(parentOf),
  ]);

  // union-find
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };

  for (const edge of validEdges) {
    const [p, c] = edge.split('->');
    union(p, c);
  }

  const components = {};
  for (const node of allNodes) {
    const rep = find(node);
    if (!components[rep]) components[rep] = new Set();
    components[rep].add(node);
  }

  const hierarchies = [];

  for (const [, nodeSet] of Object.entries(components)) {
    const compNodes = [...nodeSet];
    const compRoots = compNodes.filter(n => parentOf[n] === undefined).sort();

    // cycle detection
    const detectCycle = (startNodes) => {
      const visited = new Set();
      const stack = new Set();
      let hasCycle = false;

      const dfs = (node) => {
        if (stack.has(node)) {
          hasCycle = true;
          return;
        }
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
      // pure cycle
      const cycleRoot = compNodes.sort()[0];
      hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
      continue;
    }

    const hasCycle = detectCycle(compRoots);

    if (hasCycle) {
      hierarchies.push({ root: compRoots[0], tree: {}, has_cycle: true });
      continue;
    }

    // build tree
    const buildTree = (node) => {
      const obj = {};
      for (const child of (children[node] || [])) {
        obj[child] = buildTree(child);
      }
      return obj;
    };

    const calcDepth = (node) => {
      const kids = children[node] || [];
      if (kids.length === 0) return 1;
      return 1 + Math.max(...kids.map(calcDepth));
    };

    for (const root of compRoots) {
      const tree = { [root]: buildTree(root) };
      const depth = calcDepth(root);
      hierarchies.push({ root, tree, depth, has_cycle: false });
    }
  }

  // sort
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // summary
  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = '';
  if (nonCyclic.length > 0) {
    const maxDepth = Math.max(...nonCyclic.map(h => h.depth));
    const candidates = nonCyclic
      .filter(h => h.depth === maxDepth)
      .map(h => h.root)
      .sort();

    largest_tree_root = candidates[0];
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root,
  };

  return {
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary,
  };
}

// ===== ROUTE =====
app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL,
      error: '"data" must be an array of strings.'
    });
  }

  try {
    const result = processData(data);

    res.status(200).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL,
  ...result
});
  } catch (err) {
    res.status(500).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL,
      error: 'Internal server error',
      details: err.message
    });
  }
});

// ===== ROOT CHECK =====
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BFHL API running. Use POST /bfhl' });
});

// ===== EXPORT FOR VERCEL =====
module.exports = app;
