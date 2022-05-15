use std::path::{Path, PathBuf};

use rocket::{debug, info};
use thorns::graph::Graph;
use thorns::sourcemap::SourceMap;
use thorns::trace::Trace;

fn main() {
    // Open left Trace directory and associated code
    let left_trace = open_trace("./data/diff/left").unwrap();
    let left_sourcemap = open_sourcemap("./data/diff/left").unwrap();

    // Generate the graph for the left side
    let left_graph = get_graph(&left_trace, "parser");

    // Open right Trace directory and associated code
    let right_trace = open_trace("./data/diff/right").unwrap();
    let right_sourcemap = open_sourcemap("./data/diff/right").unwrap();

    // Generate the graph for the right side
    let right_graph = get_graph(&right_trace, "parser");

    // Diff the two graphs
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
