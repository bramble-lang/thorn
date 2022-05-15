use std::path::{Path, PathBuf};

use rocket::{debug, info};
use thorns::graph::{Graph, NodeId};
use thorns::sourcemap::SourceMap;
use thorns::trace::Trace;

fn main() {
    let stage = "parser";

    let left = "./data/diff2/left";
    let right = "./data/diff2/right";

    // Open left Trace directory and associated code
    let left_trace = open_trace(left).unwrap();
    let left_sourcemap = open_sourcemap(left).unwrap();

    // Generate the graph for the left side
    let left_graph = get_graph(&left_trace, stage).unwrap();

    // Open right Trace directory and associated code
    let right_trace = open_trace(right).unwrap();
    let right_sourcemap = open_sourcemap(right).unwrap();

    // Generate the graph for the right side
    let right_graph = get_graph(&right_trace, stage).unwrap();

    // Diff the two graphs
    let diffs = diff(&left_graph, &left_sourcemap, &right_graph, &right_sourcemap);
    print_diffs(
        &left_graph,
        &left_sourcemap,
        &right_graph,
        &right_sourcemap,
        &diffs,
    );
}

fn print_diffs(
    left: &Graph,
    left_sm: &SourceMap,
    right: &Graph,
    right_sm: &SourceMap,
    diffs: &[(NodeId, NodeId)],
) {
    // print the diffs
    for (l, r) in diffs {
        let ln = left.get_node(*l);
        let rn = right.get_node(*r);
        println!("Diff: ({:?}, {:?})", ln.source, rn.source);
        let lt = left_sm.text_in_span(ln.source).unwrap();
        let rt = right_sm.text_in_span(rn.source).unwrap();
        println!(
            "< {} | {}",
            lt,
            match (ln.ok.as_ref(), ln.error.as_ref()) {
                (None, None) => "",
                (None, Some(e)) => &e,
                (Some(o), None) => &o,
                (Some(_), Some(_)) => todo!(),
            }
        );
        println!(
            "> {} | {}",
            rt,
            match (rn.ok.as_ref(), rn.error.as_ref()) {
                (None, None) => "",
                (None, Some(e)) => &e,
                (Some(o), None) => &o,
                (Some(_), Some(_)) => todo!(),
            }
        );
        println!("---");
    }
}

fn diff(
    left: &Graph,
    left_sm: &SourceMap,
    right: &Graph,
    right_sm: &SourceMap,
) -> Vec<(NodeId, NodeId)> {
    let left_roots = left.get_roots();
    let right_roots = right.get_roots();

    let roots = left_roots.iter().zip(right_roots.iter());
    let mut diffs = vec![];
    for (l, r) in roots {
        //println!("left root: {:?}", left.get_node(*l));
        //println!("right root: {:?}", right.get_node(*r));

        // Starting at a root (assuming that structurally the root is the same)
        // traverse down both graphs and check that
        // the ok and the err are the same values
        // If they are not, then add the left span and right span tuple to the list of differences
        inner_diff(left, left_sm, *l, right, right_sm, *r, &mut diffs);
    }

    diffs
}

fn inner_diff(
    left: &Graph,
    left_sm: &SourceMap,
    l: NodeId,
    right: &Graph,
    right_sm: &SourceMap,
    r: NodeId,
    diff: &mut Vec<(NodeId, NodeId)>,
) {
    // recursively traverse both graphs at the same time using the
    // hierarchy edges: this forms a tree so there are no loops

    // if l and r differ then add to the set of differences
    // TODO: this assumes both graphs are from the same compiler stage, should also diff on that just to help with debugging
    // TODO: The diffs should store refs to the left and right Events (this will include the spans _and_ the compiler context info)
    let ln = left.get_node(l);
    let rn = right.get_node(r);
    if !(ln.ok == rn.ok && ln.error == rn.error) {
        diff.push((l, r));
    } else if left.is_leaf(l) || right.is_leaf(r) {
        let lt = left_sm.text_in_span(ln.source);
        let rt = right_sm.text_in_span(rn.source);
        match (lt, rt) {
            (Ok(lt), Ok(rt)) => {
                if lt != rt {
                    diff.push((l, r));
                }
            }
            (Ok(_), Err(_)) => todo!(),
            (Err(_), Ok(_)) => (),
            (Err(_), Err(_)) => (),
        }
    }

    // Check all children for differences
    let lchild = left.get_adj(l);
    let rchild = right.get_adj(r);
    for (lc, rc) in lchild.iter().zip(rchild.iter()) {
        inner_diff(left, left_sm, *lc, right, right_sm, *rc, diff)
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
