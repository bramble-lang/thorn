//! Command Line Interface for configuring the server via
//! the command line
use std::path::{Path, PathBuf};

use clap::Parser;

const DEFAULT_TARGET_DIR: &'static str = "./target";

/// The set of configuratoin parameters that can be passed via
/// the command line.
#[derive(Parser)]
pub struct Cli {
    #[clap(long = "target", default_value=DEFAULT_TARGET_DIR, help="The location that bramblec event data can be found")]
    target: PathBuf,
}

impl Cli {
    pub fn target(&self) -> &Path {
        &self.target
    }
}