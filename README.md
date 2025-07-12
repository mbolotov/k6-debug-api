# k6-debug-api

This npm module implements a significant portion of the [Grafana k6](https://k6.io) core API, designed to run in Node.js
for the purpose of debugging k6 scripts. It is essential for the k6 IntelliJ plugin when executing scripts in debug
mode.

## Features

* Implements major parts of the [k6 core API](https://k6.io/docs/javascript-api/).
* Allows running k6 scripts within Node.js for easier debugging.
* Provides seamless integration with the k6 IntelliJ plugin for enhanced development experience.

## Installation

To install the module, use npm:

```bash
npm install k6-debug-api --save-dev
```

## Integration with k6 IntelliJ Plugin

This module is a crucial component for the [k6 IntelliJ plugin](https://plugins.jetbrains.com/plugin/16141-k6/) when running k6 scripts in debug mode. Ensure you have
this module installed to take full advantage of the plugin's debugging capabilities.

## Contributing

We welcome contributions from the community to fix bugs and extend the implementation of this module. If you find any
issues or have suggestions for improvement, please
create [a pull request](https://github.com/mbolotov/k6-debug-api/pulls). Your contributions are highly appreciated!

## License

This project is licensed for use solely with IntelliJ-based IDEs. For more details, please refer to
the [License](./LICENSE).

## Contact

For any questions or support, please open an [issue](https://github.com/mbolotov/k6-debug-api/issues) on GitHub.
