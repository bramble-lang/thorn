# Thorn Insight Server
## Overview
A prototype server that will handle querying data about a Bramble project.

Following the LSP design idea.

LSPs have a JSON-RPC thing going, but I don't want to waste anytime figuring
that out and I don't think that would work well for interop with a web app.
So, this will just use a quick and dirty web service (Rocket) to power the
communications layer.


## Running
To run with the given test data, from this directory run:

For positive path:
```
cargo run --bin thorns -- --target=./data/fix
```

For a larger data set:
```
cargo run --bin thorns -- --target=./data/big
```

## CLI
- Give location of directory where bramblec was run from
- Give location of trace datcratea
- sourcemap file locations are relative to where bramblec was run

On starting up this will then host a JSON web service where queries can be
made by the web tool to get information about trace data or the language
project.


- start up
- Read trace data and sourcemap and build in memory data structure
- Map spans to text output (don't worry about parsing the result)
- Query: user provides a span.  This returns a set of trace events that intersect
with that span.

```json
//Query:
{
    "file": "File path",
    "span": ["low", "high"],
}

//Response:
{
    "events": [
        {
            "stage": "<stage>",
            "result": "result"
        }
    ]
}
```


## Architecture

```
-----------
| Trace JSON File |
--------------
| Trace Data Structure |
------------------------
|  Trace DS API |
-----------------
| Query Handler |
-----------------
| REST API |
------------
```

Initialization Flow:
1. Start Up
2. Get source code and trace data locations from config (CLI)
3. Load trace data into Trace Data Structure
4. Start Web Service


Request Flow:
1. Get Request from user
2. Extract query type and span information
3. Use Trace DS API to get events that intersect with Query Span
4. Convert to Response type
5. Send response to user

## File Serving
For security reasons, the Javascript libraries push back on opening random files
on the computer, unless the user has picked the file themselves.  Rather than
make some hack to get around that, this server will provide an API that will
return the contents of a specified file.  This API can then be used by web UIs
to get source code for rendering.