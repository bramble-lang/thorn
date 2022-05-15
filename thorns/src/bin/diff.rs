use std::path::{Path, PathBuf};

use rocket::{debug, info};
use thorns::graph::{Graph, NodeId};
use thorns::sourcemap::SourceMap;
use thorns::trace::Trace;

fn main() {
    // Open left Trace directory and associated code
    let left_trace = open_trace("./data/diff/left").unwrap();
    let left_sourcemap = open_sourcemap("./data/diff/left").unwrap();

    // Generate the graph for the left side
    let left_graph = get_graph(&left_trace, "parser").unwrap();

    // Open right Trace directory and associated code
    let right_trace = open_trace("./data/diff/right").unwrap();
    let right_sourcemap = open_sourcemap("./data/diff/right").unwrap();

    // Generate the graph for the right side
    let right_graph = get_graph(&right_trace, "parser").unwrap();

    // Diff the two graphs
    diff(&left_graph, &right_graph);
}

fn diff(left: &Graph, right: &Graph) {
    let left_roots = left.get_roots()[0];
    let right_roots = right.get_roots()[0];

    println!("left root: {:?}", left.get_node(left_roots));
    println!("right root: {:?}", right.get_node(right_roots));

    // Starting at a root (assuming that structurally the root is the same)
    // traverse down both graphs and check that
    // the ok and the err are the same values
    // If they are not, then add the left span and right span tuple to the list of differences
    inner_diff(left, left_roots, right, right_roots);
}

fn inner_diff(left: &Graph, l: NodeId, right: &Graph, r: NodeId) {
    // recursively traverse both graphs at the same time using the
    // hierarchy edges: this forms a tree so there are no loops

    // if l and r differ then add to the set of differences
    // TODO: this assumes both graphs are from the same compiler stage, should also diff on that just to help with debugging
    let ln = left.get_node(l);
    let rn = right.get_node(r);
    if !(ln.ok == rn.ok && ln.error == rn.error) {
        println!("Diff: ({:?}, {:?})", ln.source, rn.source);
    }

    // Check all children for differences
    let lchild = left.get_adj(l);
    let rchild = right.get_adj(r);
    for (lc, rc) in lchild.iter().zip(rchild.iter()) {
        inner_diff(left, *lc, right, *rc)
    }
}

fn open_trace(path: &str) -> Result<Trace, serde_json::Error> {
    let target_dir = Path::new(path).to_path_buf();
    let file = get_trace_file(target_dir.clone());

    Trace::load(file.to_path_buf())
}

fn open_sourcemap(path: &str) -> Result<SourceMap, serde_json::Error> {
    let target_dir = Path::new(path).to_path_buf();
    let sourcemap_path = get_sourcemap_file(target_dir.to_path_buf());
    SourceMap::load(sourcemap_path)
}

fn get_graph(trace: &Trace, stage: &str) -> Option<Graph> {
    info!("Graph for {}", stage);

    // Filter to parser
    let pe: Vec<_> = trace
        .events
        .iter()
        .filter(|e| e.stage == stage)
        .map(|e| e.clone())
        .collect();

    if pe.len() > 0 {
        let mut graph = Graph::new(&pe);
        graph.merge_noops();
        info!("Nodes: {}", graph.num_nodes());
        info!("Edges: {}", graph.num_edges());
        debug!("{:?}", graph);

        Some(graph)
    } else {
        None
    }
}

/// Returns the path to the trace file
fn get_trace_file(mut dir: PathBuf) -> PathBuf {
    dir.push("trace.json");
    dir
}

/// Returns the path to the source map file
fn get_sourcemap_file(mut dir: PathBuf) -> PathBuf {
    dir.push("sourcemap.json");
    dir
}
