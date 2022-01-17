import { Component } from 'react';

export class CodeDisplay extends Component {
    // Add a handle selected span change callback to prop
    constructor(props) {
        super(props);
        this.state = {
            name: 'React',
            selectedSpan: [],
        };
    }

    // If a user clicks on the code text, capture the span of code that was
    // clicked on or selected.  This can then be used for queries to the
    // language server.
    handleClick(e) {
        if (this.props.codeOffsetRange && this.props.codeOffsetRange.length === 2) {
            var sel = window.getSelection();
            var rng = sel.getRangeAt(0);

            // Convert from local offsets to global offsets which can be used to
            // query the langage server
            var start = rng.startOffset + this.props.codeOffsetRange[0];
            var end = rng.endOffset + this.props.codeOffsetRange[0];

            this.props.handleSelect([start, end]);
        }
    }

    render() {
        return (
            <div>
                <h3>Code:</h3>
                <div id="show-text" onClick={(e) => this.handleClick(e)}>
                    <pre>
                        <code>
                            {this.renderCode()}
                        </code>
                    </pre>
                </div>
            </div>
        );
    }

    // Render the code currently stored in state.  If there is a highlightSpan
    // then highlight the code text that corresponds to the hightlighted span.
    renderCode() {
        if (this.props.highlightSpan && this.props.highlightSpan.length === 2) {
            // Convert the highlight span from global offsets to local offsets
            var span = [...this.props.highlightSpan];
            span[0] = span[0] - this.props.codeOffsetRange[0];
            span[1] = span[1] - this.props.codeOffsetRange[0];
            console.debug("Highlight span: ", span);

            // If there is a reference span then highlight that too
            if (this.props.highlightRefSpan && this.props.highlightRefSpan.length === 2) {
                console.debug("Ref Span", this.props.highlightRefSpan);
                // Convert from Global Offset space to Local Offset space
                var refSpan = [0, 0];
                refSpan[0] = this.props.highlightRefSpan[0] - this.props.codeOffsetRange[0];
                refSpan[1] = this.props.highlightRefSpan[1] - this.props.codeOffsetRange[0];

                // Split code up between the highlighted and unhighlighted code
                var pre = this.props.code.slice(0, span[0]);
                var token = this.props.code.slice(span[0], span[1]);
                var mid = this.props.code.slice(span[1], refSpan[0]);
                var ref = this.props.code.slice(refSpan[0], refSpan[1]);
                var post = this.props.code.slice(refSpan[1]);

                // Insert markdown to highlight the code segment
                return <div>
                    {pre}
                    <span className="code-highlight">{token}</span>
                    {mid}
                    <span className="code-ref-highlight">{ref}</span>
                    {post}
                </div>;
            } else {
                // Split code up between the highlighted and unhighlighted code
                var pre = this.props.code.slice(0, span[0]);
                var token = this.props.code.slice(span[0], span[1]);
                var post = this.props.code.slice(span[1]);

                // Insert markdown to highlight the code segment
                return <div>{pre}<span className="code-highlight">{token}</span>{post}</div>;
            }
        } else {
            return this.props.code;
        }
    }
}