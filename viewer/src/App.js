import './App.css';
import { Component } from 'react';
import { TraceDisplay } from './TraceDisplay';
import SplitPane, {
  Divider,
  SplitPaneLeft,
  SplitPaneRight,
} from "./SplitPane";
import CssBaseline from '@mui/material/CssBaseline';
import { CodeDisplay } from './CodeDisplay';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Graph from './Graph';

// Make this into a class
class App extends Component {
  constructor() {
    super();
    this.selectSpan = this.selectSpan.bind(this);
    this.handleOpenFile = this.handleOpenFile.bind(this);
    this.handleEventSelection = this.handleEventSelection.bind(this);
    this.handleSetStageFilter = this.handleSetStageFilter.bind(this);
    this.handleFileSelect = this.handleFileSelect.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.state = {
      name: 'App',
      selectedSpan: [],
      selectedTraceEventSpan: [],
      file: '',
      code: '',
      codeOffsetRange: [],
      stageFilter: 'all',
      projectFiles: [],
      graph: { edges: [], nodes: [] },
      selectedTab: 0,
      selectedFileId: '',
    }
  }

  componentDidMount() {
    this.getFiles();
    this.getGraph('parser');
  }

  selectSpan(span) {
    this.setState({ selectedSpan: span, selectedTraceEventSpan: [] })
  }

  handleEventSelection(event) {
    console.debug("Handle Event Selection");
    console.debug(event);
    this.setState({ selectedTraceEventSpan: event.traceEventSpan, selectedTraceEventRefSpan: event.refSpan });
  }

  handleOpenFile() {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var file = document.querySelector('input[type=file]').files[0];
      console.debug("Open ", file);
      this.setState({ file: file });
    } else {
      alert("Your browser is too old to support HTML5 File API");
    }
  }

  handleFileSelect(event) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      var file_id = event.target.value;
      console.debug("Select File ", file_id);
      this.loadCode(file_id);
      this.setState({ selectedFileId: file_id });
    } else {
      alert("Your browser is too old to support HTML5 File API");
    }
  }

  handleSetStageFilter(event) {
    var stage = event.target.value;
    console.debug("Picked ", stage);
    if (this.state.stageFilter !== stage) {
      this.setState({ stageFilter: stage })
      this.getGraph(stage);
    }
  }

  handleTabChange(event, newValue) {
    this.setState({ selectedTab: newValue });
  }

  // Needs a callback in TextFile which updates the state
  render() {
    return (
      <div className="App">
        <CssBaseline />
        <SplitPane className="split-pane-row">
          <SplitPaneLeft>
            {this.renderProjectFileMenu()}
            <CodeDisplay
              code={this.state.code}
              codeOffsetRange={this.state.codeOffsetRange}
              handleSelect={this.selectSpan}
              highlightSpan={this.state.selectedTraceEventSpan}
              highlightRefSpan={this.state.selectedTraceEventRefSpan}
            >
            </CodeDisplay>
          </SplitPaneLeft>
          <Divider className="separator-col" />

          <SplitPaneRight>
            {this.renderStageFilterMenu()}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={this.state.selectedTab}
                onChange={this.handleTabChange}
                aria-label="basic tabs example"
              >
                <Tab label="Event List" {...a11yProps(0)} />
                <Tab label="Event Graph" {...a11yProps(1)} />
              </Tabs>
            </Box>
            <TabPanel value={this.state.selectedTab} index={0}>
              <TraceDisplay
                span={this.state.selectedSpan}
                onSelection={this.handleEventSelection}
                stageFilter={this.state.stageFilter} />
            </TabPanel>
            <TabPanel value={this.state.selectedTab} index={1}>
              <Graph id="my-graph" data={this.state.graph} selectedSpan={this.state.selectedSpan} />
            </TabPanel>
          </SplitPaneRight>
        </SplitPane>
      </div>
    );
  }

  renderStageFilterMenu() {
    return (
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <InputLabel id="stage-select-label">Stage</InputLabel>
          <Select
            labelId="stage-select-label"
            id="stage-select"
            label="Stage"
            onChange={this.handleSetStageFilter}
            value={this.state.stageFilter}
          >
            <MenuItem value={"all"}>All</MenuItem>
            <MenuItem value={"lexer"}>Lexer</MenuItem>
            <MenuItem value={"parser"}>Parser</MenuItem>
            <MenuItem value={"canonize-item-path"}>Canonizer</MenuItem>
            <MenuItem value={"type-resolver"}>Type Resolver</MenuItem>
            <MenuItem value={"llvm"}>LLVM</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  }

  renderProjectFileMenu() {
    return (
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <InputLabel id="project-file-select-label">File</InputLabel>
          <Select
            labelId="project-file-select-label"
            id="file-select"
            label="File"
            onChange={this.handleFileSelect}
            value={this.state.selectedFileId}
          >
            {this.state.projectFiles.map((file, index) => {
              return (<MenuItem key={file[0]} value={file[0]}>{file[1]}</MenuItem>);
            })}
          </Select>
        </FormControl>
      </Box>
    );
  }

  getFiles() {
    console.debug("Get Files");

    // Call language server to get events that contain this span
    fetch("/files")
      .then(res => res.json())
      .then((files) => {
        console.log(files)
        this.setState({
          projectFiles: files,
        })
      })
      .catch(console.error)
  }

  /*
  Calls the Thorn server and gets a DOT representing the Parser AST.
  */
  getGraph(stage) {
    console.debug("Get Graph ", stage);

    if (stage === 'all') {
      stage = 'parser'
    }

    // Call language server to get events that contain this span
    fetch("/data/graph?stage=" + stage)
      .then((res) => res.text())
      .then((dot) => {
        const graph = JSON.parse(dot);

        this.setState({
          graph: graph,
        })
      })
      .catch(console.error)
  }

  loadCode(id) {
    console.debug("Get FileContent");

    // Call language server to get events that contain this span
    fetch("/files/" + id)
      .then(res => res.json())
      .then((content) => {
        console.debug(content);
        this.setState({
          code: content[0],
          codeOffsetRange: content[1],
          selectedSpan: [],
        })
      })
      .catch(console.error)
  }
}

export default App;

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}