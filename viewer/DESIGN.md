# Design
Details on design for this app.

Components:
1. `Text` - handles loading and displaying the text from a source file.  Handles 
the user selecting or clicking on source code elements.
2. `Event` - Handles displaying a single trace event
3. `Trace` - Handles displaying a list of trace events.  This queries the Thorn Server
for the set of traces corresponding to a span
4. `App` - Manages the `Text` and `Trace` components.  It takes the span selected
by the user in `Text` and passes it to `Trace` so that Trace can query the LS
and display the set of associated trace events