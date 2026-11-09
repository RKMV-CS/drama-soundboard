// Entry point of the single-file build. The executable is both the launcher and the server:
// the launcher starts it again with --server.
if (process.argv.slice(2).includes("--server")) {
  const { app, init } = require("../server");
  const port = process.env.PORT || 3000;
  init().then(() => app.listen(port, () => console.log(`Drama soundboard listening on http://localhost:${port}`)));
} else {
  require("./launch").main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
