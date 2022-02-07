//! Defines the various APIs for the Thorn Insight Server


use std::{fs::File, io::{Read, Seek, SeekFrom}, time::Instant};

use rocket::{serde::json::Json, State};

use crate::{trace::{Trace, Event, Span}, graph::Graph, sourcemap::SourceMap};

/// Returns the trace events that are generated by the compiler when it
/// processes text that contains the given span.
#[get("/?<low>&<high>")]
pub fn get_data<'sm, 'ld>(low: u32, high: u32, ld: &'ld State<Trace>) -> Json<Vec<&'ld Event>> {
    let x = ld.find(low, high);
    Json(x)
}

/// Return the graph topology of events for the given compiler stage
#[get("/graph?<stage>")]
pub fn get_graph<'sm, 'ld>(stage: &str, ld: &'ld State<Trace>) -> Json<Graph> {
    info!("Graph for {}", stage);

    // Filter to parser
    let pe: Vec<_> = ld
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

        Json(graph)
    } else {
        todo!()
    }
}

/// Get the list of files that belong to the currently hosted Bramble
/// project.
#[get("/files")]
pub fn get_files(sm: &State<SourceMap>) -> Json<Vec<(usize, &String)>> {
    Json(sm.get_files())
}

/// Get the contents of a specific project file
#[get("/files/<id>")]
pub fn get_file(id: usize, sm: &State<SourceMap>) -> Json<(String, Span)> {
    let file = sm.get_file(id);
    let offset_range = sm.get_file_offset_range(file).unwrap();

    let mut src = File::open(&file).expect(&format!("Could not open {:?}", &file));
    let mut contents = String::new();
    src.read_to_string(&mut contents).unwrap();

    Json((contents, *offset_range))
}

/// Get the text associated with a given span
#[get("/files?<low>&<high>")]
pub fn get_span(low: u32, high: u32, sm: &State<SourceMap>) -> Json<String> {
    if high <= low {
        panic!("Invalid request")
    }

    let start = Instant::now();

    // Find out what file(s) the span covers
    let files = sm.files_in_span(Span::new(low, high));
    debug!("Files in Span: {:?}", files);

    let mut total_span_text = String::new();

    // For each file in the span
    for (file, s) in files {
        // Convert the low span to a local offset within the file
        // if the local_low is < 0, then set to 0
        let local_low = if low < s.low() { 0 } else { low - s.low() } as u64;

        // Convert the high of the span to a local high if it's greater than
        // the length of teh file then just set to the lenght of the file
        let local_high = if high > s.high() {
            s.high() - s.low()
        } else {
            high - s.low()
        } as u64;

        let length = local_high - local_low;

        // Read the span from the file
        let mut src = File::open(file).unwrap();
        src.seek(SeekFrom::Start(local_low)).unwrap();
        let mut span_bytes = vec![0; length as usize];
        src.read_exact(&mut span_bytes).unwrap();

        // Append the span to result
        let span_text = std::str::from_utf8(&span_bytes).unwrap();
        total_span_text.push_str(span_text);
    }

    let elapsed_time = start.elapsed();
    info!("Duration: {}us", elapsed_time.as_micros());

    // Return the span
    Json(total_span_text)
}