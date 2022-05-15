use std::{
    cmp::Ordering,
    collections::HashMap,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::PathBuf,
};

use serde::Deserialize;

use crate::trace::Span;

pub struct SourceMap {
    file_offset_ranges: HashMap<String, Span>,
    files: Vec<String>,
}

#[derive(Deserialize)]
pub struct SourceMapEntry {
    source: String,
    span: Span,
}

impl SourceMap {
    pub fn load(path: PathBuf) -> Result<SourceMap, serde_json::Error> {
        let file = File::open(&path).expect(&format!("Could not open: {:?}", path));
        serde_json::from_reader(file).map(|sm: Vec<SourceMapEntry>| {
            // Extract list of file names from map
            let mut files = vec![];

            for e in &sm {
                files.push(e.source.clone());
            }

            let mut map = HashMap::new();

            for e in sm {
                map.insert(e.source, e.span);
            }

            SourceMap {
                file_offset_ranges: map,
                files,
            }
        })
    }

    /// Looks up a file path by ID
    pub fn get_file(&self, index: usize) -> &str {
        &self.files[index]
    }

    /// Return a list of all the files in hosted project
    pub fn get_files(&self) -> Vec<(usize, &String)> {
        self.files.iter().enumerate().collect()
    }

    /// Returns the global offset range assigned to this file, if the file is in
    /// the project.  Otherwise, returns an error
    pub fn get_file_offset_range(&self, file: &str) -> Result<&Span, String> {
        self.file_offset_ranges
            .get(file)
            .ok_or(format!("{} not in source map", file))
    }

    /// Given a span, this will return all the files contained in that span
    /// In the order of their position in the span.
    pub fn files_in_span(&self, span: Span) -> Vec<(&str, Span)> {
        let mut files: Vec<_> = self
            .file_offset_ranges
            .iter()
            .filter(|(_, file_span)| file_span.intersects(&span))
            .collect();
        files.sort_by(|(_, a), (_, b)| {
            if a.low() == b.low() && a.high() == b.high() {
                Ordering::Equal
            } else if a.low() < b.low() {
                // less
                Ordering::Less
            } else if a.low() == b.low() && a.high() < b.high() {
                // less
                Ordering::Less
            } else {
                // greater
                Ordering::Greater
            }
        });

        files.into_iter().map(|(f, s)| (f.as_str(), *s)).collect()
    }

    /// Returns the text from the source code that the give [`Span`] covers.
    pub fn text_in_span(&self, span: Span) -> Result<String, SourceError> {
        let files = self.files_in_span(span);

        if files.is_empty() {
            // return error
            return Err(SourceError::SourceNotFound(span));
        }

        // Convert all the spans to code snippets.  If the span crosses multiple files this will join them together
        files
            .iter()
            .map(|(f, fspan)| self.read_span(f, *fspan, span))
            .collect::<Result<String, _>>()
    }

    fn read_span(&self, f: &str, fspan: Span, read_span: Span) -> Result<String, SourceError> {
        let span = fspan
            .intersection(read_span)
            .ok_or_else(|| SourceError::UnexpectedEof)?;
        let local_low = (span.low() - fspan.low()) as u64;
        let local_high = (span.high() - fspan.low()) as u64;

        let len = local_high - local_low;

        let text = {
            let mut file = std::fs::File::open(f)?;

            // Read the span from the file
            let mut buf = vec![0; len as usize];
            file.seek(SeekFrom::Start(local_low))?;
            file.read_exact(&mut buf)?;

            String::from_utf8(buf)?
        };

        Ok(text)
    }
}

/// Errors that can happen when trying to read from a source code stream.
#[derive(Debug)]
pub enum SourceError {
    ExceededAssignedRange,
    OffsetExceededMaxSize,
    UnexpectedEof,
    Io(std::io::Error),
    FromUtf8Error(std::string::FromUtf8Error),
    SourceNotFound(Span),
}

impl From<std::io::Error> for SourceError {
    fn from(io: std::io::Error) -> Self {
        Self::Io(io)
    }
}

impl From<std::string::FromUtf8Error> for SourceError {
    fn from(e: std::string::FromUtf8Error) -> Self {
        Self::FromUtf8Error(e)
    }
}
