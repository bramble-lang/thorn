//! A set of trace events generated by a single execution of the Bramble compiler

use std::{fs::File, path::PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct Span(u32, u32);

impl Span {
    pub fn new(low: u32, high: u32) -> Span {
        Span(low, high)
    }

    /// Returns the infimum of the Span
    pub fn low(&self) -> u32 {
        self.0
    }

    /// Returns the supremum of the Span
    pub fn high(&self) -> u32 {
        self.1
    }

    /// Tests if two spans have an intersection
    pub fn intersects(&self, a: &Span) -> bool {
        a.low() <= self.high() && a.high() >= self.low()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    pub id: u64,
    pub parent_id: Option<u64>,
    pub source: Span,
    pub stage: String,
    pub ok: Option<String>,
    pub error: Option<String>,

    #[serde(rename = "ref")]
    pub ref_spans: Option<Span>,
}

impl Event {
    pub fn intersect(&self, low: u32, high: u32) -> bool {
        self.source.0 <= high && low < self.source.1
    }
}

#[derive(Serialize)]
pub struct Trace {
    pub events: Vec<Event>,
}

impl Trace {
    pub fn load(file: PathBuf) -> Result<Trace, serde_json::Error> {
        let trace_file = File::open(&file).expect(&format!("Could not open: {:?}", file));
        serde_json::from_reader(trace_file).map(|ev| Trace { events: ev })
    }

    pub fn find(&self, low: u32, high: u32) -> Vec<&Event> {
        let mut results = vec![];
        for e in &self.events {
            if e.intersect(low, high) {
                results.push(e)
            }
        }
        results
    }
}