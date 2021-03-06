# Thorn Insight Tools Platform
Insight tools built off of the insight data generated when running the Bramble compiler.

Sample Insight data is contained in `./service/data`

## To Use Thorn
Thorn consists of two components: the Server and the Viewer. The Server
is a Rust service which runs from within your project directory and 
hosts the Thorn Insight data generated by the Bramble Compiler (this
data is stored in the `./target` directory). The Viewer is a React application
that connects to the Server and allows you to visualize and interact
with the Insight data.

### Installing
#### Viewer
The Viewer is a React based web application that is hosted by the `thorns`
server and lets you browse the insight data generated for your code.

`thorns` defaults to looking for the static web app at `/usr/lib/thorns/viewer`
but this can be overridden with then env variable `BRAMBLE_THORN_VIEWER_PATH`.

To setup the Viewer so that `thorns` can find it follow these steps:
1. Create a the `/usr/lib/thorns/viewer` directory.
1. `cd` into `viewer`
1. Run `npm run build` to build the static files for the Viewer
1. `cp -r ./build/* /usr/lib/thorns/viewer/.` to copy the web app files to the
`thorns` application data folder

#### Thorns
With the Viewer web application setup, you can install the `thorns` 
host application.

From within the `thorns` directory run:
```
cargo install -- .
```

This will build a release version of the Server and install it in the
Rust binaries directory.  Allowing you to run the server from the command
line.

### Host Your Project
After installing the server, go to your projects root directory (where
you run the Bramble compiler from and where the output `./target` 
directory is).  Run `thorns` from that directory, it will automatically
load the Insights data from the `./target` directory and host it for
querying.