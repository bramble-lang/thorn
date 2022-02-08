import dagre from 'dagre';
import './App.css';
import { Component } from 'react';
import * as joint from "jointjs";
import IconButton from '@mui/material/IconButton';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import Tooltip from '@mui/material/Tooltip';

// Constants used to help with formatting and rendering
const tooltipDelayMs = 700;
const charWidth = 7;
const charHeight = 14;
const baseWidth = 50;

var dragStartPosition = null;
var isDragging = false;

class Graph extends Component {
    namespace = joint.shapes;
    graph = new joint.dia.Graph({}, { cellNamespace: this.namespace });

    constructor() {
        super();
        this.state = {
            paper: null,
            nodes: [],
            selectedNode: null,
        }
    }

    componentDidUpdate(prevProps) {
        // If the source graph data changes then reconstruct the graph
        if (prevProps.data != this.props.data) {
            this.constructGraph();
        }

        // Reset the color and styling of every node
        this.resetNodesColor();

        // If there are highlighted spans, then highlight the associated nodes
        if (this.props.selectedSpan) {
            for (var nid in this.state.nodes) {
                const node = this.state.nodes[nid];
                const node_span = node.attr('data/span');
                if (node_span[0] <= this.props.selectedSpan[0] && this.props.selectedSpan[1] <= node_span[1]) {
                    this.setNodeColor(node, 'orange', 'orange', node.get('defaultHeaderFill'));
                } else {
                    this.setNodeColor(node, 'black', 'black', node.get('defaultHeaderFill'));
                }
            }
        }

        if (this.state.selectedNode) {
            this.setNodeColor(this.state.selectedNode, 'black', 'black', 'lightgreen');

            // if the selected node refers to other nodes, then color them
            const refNode = this.state.selectedNode.get('refNode');
            if (refNode) {
                console.debug('refNode: ', refNode);
                this.setNodeColor(refNode, 'black', 'black', 'lightyellow');
            }
        }
    }

    resetNodesColor() {
        for (var nid in this.state.nodes) {
            const node = this.state.nodes[nid];
            const defaultHeaderFill = node.get('defaultFill');
            const defaultHeaderStroke = node.get('defaultHeaderStroke');
            const defaultBodyStroke = node.get('defaultBodyStroke');
            this.setNodeColor(node, defaultBodyStroke, defaultHeaderStroke, defaultHeaderFill);
        }
    }

    setAllNodesColor(bodyStroke, headerStroke, headerFill) {
        for (var nid in this.state.nodes) {
            const node = this.state.nodes[nid];
            this.setNodeColor(node, bodyStroke, headerStroke, headerFill);
        }
    }

    setNodeColor(node, bodyStroke, headerStroke, headerFill) {
        node.attr('body/stroke', bodyStroke);
        node.attr('header/stroke', headerStroke);
        node.attr('header/fill', headerFill);
    }

    componentDidMount() {
        console.debug("Creating JointJS paper");

        var targetElement = document.getElementById(this.props.id);

        // Create the canvas where the graph will be rendered.  This must be created
        // after the target HTML element is mounted to the page.
        var paper = new joint.dia.Paper({
            el: targetElement,
            model: this.graph,
            width: '100%',
            height: '600',
            gridSize: 10,
            drawGrid: true,
            background: {
                color: 'rgba(100, 100, 100, 0.3)'
            },
            cellViewNamespace: this.namespace,
            perpendicularLinks: false
        });

        // Configure clicking on a cell
        paper.on('cell:pointerclick', (cv, event, x, y) => {
            console.debug("Cell Span: ", cv.model.attr('data/span'));
            console.debug("Cell Id: ", cv.model.attr('data/id'));
            this.setState({ selectedNode: cv.model });
        });

        // Configure panning
        paper.on('blank:pointerdown',
            function (event, x, y) {
                isDragging = true;
                var scale = paper.scale();
                dragStartPosition = { x: x * scale.sx, y: y * scale.sy };
            }
        );

        paper.on('cell:pointerup blank:pointerup', function (cellView, x, y) {
            isDragging = false;
        });

        targetElement.addEventListener('mousemove', event => {
            if (isDragging) {
                paper.translate(
                    event.offsetX - dragStartPosition.x,
                    event.offsetY - dragStartPosition.y);
            }
        });

        this.setState({ paper: paper });
        this.constructGraph();
    }

    constructGraph() {
        // Clear the graph of any previous elements
        this.graph.clear();

        // Create Joint nodes from graph data
        console.debug("Adding Nodes");
        var nodes = {};
        for (var nodeId in this.props.data.nodes) {
            var n = this.props.data.nodes[nodeId];
            if (n.ok) {
                nodes[nodeId] = this.addNode(n, n.ok, 'lightblue');
            } else if (n.error) {
                nodes[nodeId] = this.addNode(n, n.error, 'red');
            } else {
                //nodes[nodeId] = this.addNode(n, "NOOP", 'white');
            }
        }

        // Create the edges
        console.debug("Adding edges");
        var links = [];
        this.props.data.edges.forEach((edge, idx) => {
            if (edge.ty === "Parent") {
                var e = this.addLink(nodes[edge.source], nodes[edge.target]);
                links.push(e);
            } else if (edge.ty === "Ref") {
                //var e = this.addRefLink(nodes[edge.source], nodes[edge.target]);
                //links.push(e);
                this.addRefToNode(nodes[edge.source], nodes[edge.target]);
            } else {
                console.error("Unrecognized edge type: ", edge.ty);
            }
        });

        console.debug("Auto layout");
        this.autoLayout();

        this.setState({ nodes: nodes });
    }

    /*
    Given a graph automatically configure a top-down layout of the nodes which
    will try to get parent nodes above child nodes (e.g. a tree view).
    */
    autoLayout() {
        joint.layout.DirectedGraph.layout(this.graph, {
            graphlib: dagre.graphlib,
            dagre: dagre,
            setVertices: false,
            rankDir: 'TB',
            marginX: 100,
            marginY: 100
        });
    }

    /*
        Creates a directed link from the source node to the target node and
        adds it to the graph for rendering.  The link object is returned.
    */
    addLink(source, target) {
        var link = new joint.shapes.standard.Link();
        link.attr('line/stroke', 'black');
        link.connector('jumpover', { size: 10 });
        link.source(source);
        link.target(target);
        link.set('weight', 5000)
        link.addTo(this.graph);

        return link;
    }

    /*
    Adds a property to the source node which links to the target node as a 
    reference used in determining the value of the source node.
    */
    addRefToNode(source, target) {
        source.set('refNode', target);
    }

    /*
    Adds a new node to the graph and returns the node object, so that it can
    be used for creating links or for further customization.
    */
    addNode(node, body, color) {
        // Compute the width of the cell
        const cellWidth = this.calculateCellWidth(body);

        // Compute the height of the cell
        var newlineCount = (body.match(/\n/g) || []).length;
        const cellHeight = (newlineCount + 2) * charHeight + 30;

        // create cell
        var cell = new joint.shapes.standard.HeaderedRectangle();
        cell.resize(cellWidth, cellHeight);
        cell.attr('root/title', 'joint.shapes.standard.HeaderedRectangle');
        cell.attr('header/fill', color);
        cell.attr('headerText/text', node.source);
        cell.attr('bodyText/text', body);
        cell.attr('data/span', node.source);
        cell.attr('data/id', node.id);


        // Store the default colors for this node so that any changes to hte color
        // can be easily reset
        cell.set('defaultHeaderFill', color);
        cell.set('defaultHeaderStroke', 'black');
        cell.set('defaultBodyStroke', 'black');

        cell.addTo(this.graph);

        // Call language server to get the text associated with the span
        // then make that the header value
        this.fetchSpanTextForNode(cell, node.source);

        return cell;
    }

    // Calculate how wide a cell needs to be in order to encapsulate the given body text
    calculateCellWidth(text) {
        // The text may consist of multiple lines, so the total length of the text would
        // be several factors too big.  Therefore, use the length of the longest line not
        // the length of `text`
        const longestLine = this.lengthOfLongestLine(text);

        // Compute the width of the cell
        const cellWidth = longestLine * charWidth + baseWidth;
        return cellWidth;
    }

    lengthOfLongestLine(text) {
        var longestLine = 0;
        var currentLine = 0;
        for (var i in text) {
            if (text[i] === '\n') {
                if (currentLine > longestLine) {
                    longestLine = currentLine;
                }
                currentLine = 0;
            } else {
                currentLine += 1;
            }
        }

        if(longestLine === 0){
            longestLine = currentLine;
        }

        return longestLine;
    }

    // Asynchronous function that queries the Thorn LSP to get the text value of the given
    // span.
    fetchSpanTextForNode(node, span) {
        // Call language server to get the text associated with the span
        // then make that the header value
        fetch("/files?low=" + span[0] + "&high=" + span[1])
            .then((res) => res.json())
            .then((text) => {
                // Remove newlines so that the cell header text can always be rendered as one line
                text = text.replace(/[\n\r]/gm, ' ');

                // If the text is too long then replace the middle of the text with "..."
                const maxLength = 30;
                if (text.length >= maxLength) {
                    text = text.slice(0, maxLength / 2) + "..." + text.slice(text.length - maxLength / 2, text.length);
                }
                node.attr('headerText/text', text)

                const cellWidth = this.calculateCellWidth(text);
                const currentSize = node.size();
                if (cellWidth > currentSize.width) {
                    const cellHeight = currentSize.height;
                    node.resize(cellWidth, cellHeight);
                }
                this.autoLayout();
            })
            .catch(console.error)
    }

    render() {
        return (
            <div>
                <Tooltip title="Zoom In" enterDelay={tooltipDelayMs}>
                    <IconButton onClick={() => {
                        const scale = this.state.paper.scale().sx;
                        if (scale <= 2.0) {
                            this.state.paper.scale(scale + 0.1);
                        }
                    }}><ZoomInIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out" enterDelay={tooltipDelayMs}>
                    <IconButton onClick={() => {
                        const scale = this.state.paper.scale().sx;
                        if (scale >= 0.1) {
                            this.state.paper.scale(scale - 0.1);
                        }
                    }}><ZoomOutIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Zoom To Fit" enterDelay={tooltipDelayMs}>
                    <IconButton onClick={() => {
                        this.state.paper.scaleContentToFit();
                    }}><CenterFocusStrongIcon /></IconButton>
                </Tooltip>
                <div id={this.props.id}></div>
            </div >
        );
    }
}

export default Graph;
