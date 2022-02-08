import { Component } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

/*
    API:
    Inputs:
        - props.span: span that TraceDisplay will get trace events for and display

    Outputs:
        - onSelection: passes the span of the selected trace event up to the parent
        so that the parent can react to the selection.
*/
export class TraceDisplay extends Component {
    constructor(props) {
        console.debug("Constructed");
        super(props);
        this.getTraceEvents = this.getTraceEvents.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.state = {
            trace: [],
            selectedIndex: -1,
        }
    }

    componentDidUpdate(prevProps) {
        console.debug("Updated");
        if (this.props.span !== prevProps.span) {
            this.getTraceEvents(this.props.span);
        }
    }

    componentDidMount() {
        console.debug("Mounted");
        this.getTraceEvents(this.props.span);
    }

    render() {
        var span = this.props.span;

        if (span.length === 2) {
            return (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 15 }}>Stage</TableCell>
                                <TableCell sx={{ minWidth: 15 }}>Span</TableCell>
                                <TableCell>Result</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                this.state.trace.map((item, index) => {
                                    if (!this.props.stageFilter
                                        || this.props.stageFilter === ''
                                        || this.props.stageFilter === 'all'
                                        || item.stage === this.props.stageFilter) {

                                        var state = item.ok;
                                        if (item.error) {
                                            state = item.error;
                                        }

                                        return (
                                            <TableRow key={index} onClick={(event) => this.handleClick(event, index)} hover={true} selected={this.isSelected(index)}>
                                                <TableCell>{item.stage}</TableCell>
                                                <TableCell>[{item.source[0]}, {item.source[1]}]</TableCell>
                                                <TableCell>{state}</TableCell>
                                            </TableRow>
                                        )
                                    } else {
                                        return <div />;
                                    }
                                })
                            }
                        </TableBody>
                    </Table >
                </TableContainer>
            );
        } else {
            return (<div>
            </div>)
        }
    }

    // Query the server and get the events associated with the span assigned
    // to this component
    getTraceEvents() {
        console.debug("Get Trace Events");

        if (this.props.span && this.props.span.length === 2) {
            var start = this.props.span[0];
            var end = this.props.span[1];

            // Call language server to get events that contain this span
            fetch("/data?low=" + start + "&high=" + end)
                .then(res => res.json())
                .then((data) => {
                    this.setState({
                        trace: data,
                    })
                })
                .catch(console.error)
        }
    }

    // Send information about the selected Trace Event up to the parent component
    // This should probably be called by componentDidUpdate because that will be called
    // when the state is updated
    onSelection(traceEventSpan, refSpan) {
        console.debug("Calling onSelection Callback", traceEventSpan, refSpan);
        if (this.props.onSelection) {
            this.props.onSelection({
                traceEventSpan: traceEventSpan,
                refSpan: refSpan,
            }); <TraceDisplay
                span={this.state.selectedSpan}
                onSelection={this.handleEventSelection}
                stageFilter={this.state.stageFilter} />
        }
    }

    // Handle clicks on the event table
    handleClick(_, index) {
        if (index >= 0 && index < this.state.trace.length) {
            this.setSelection(index);
        } else {
            console.error("Index out of range of Trace list");
        }
    };

    // Mark the given index as the currently selected trace event
    setSelection(index) {
        var selectedSpan = [...this.state.trace[index].source];
        var refSpan = [];
        if (this.state.trace[index].ref) {
            refSpan = [...this.state.trace[index].ref];
        }

        console.debug(index, selectedSpan);
        this.onSelection(selectedSpan, refSpan);
        this.setState({
            selectedIndex: index,
        });
    }

    isSelected(index) {
        return index === this.state.selectedIndex;
    }
}