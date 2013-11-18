# Contributing

We are happy to accept any contributions that make sense and respect the rules listed below.

## How to contribute

1. Fork the repo.
2. Create a feature branch for your contribution out of the `develop` branch. We use the [git-flow][gitflow-tool] tool to implement the [successful Git branching model][gitflow-post]. Only one contribution per branch is accepted.
3. Implement your contribution while respecting our rules (see below).
4. Run `npm test` to make sure you didn't break anything.
5. Add tests for your contribution so that no one else will break it.
6. Submit a pull request against our `develop` branch!

## Rules

* **Do** use feature branches.
* **Do** conform to existing coding style so that your contribution fits in.
* **Do** use [EditorConfig] to enforce our [whitespace rules](.editorconfig). If your editor is not supported, enforce the settings manually.
* **Do** run `npm test` for CoffeeLint, JSONLint and unit test coverage.
* **Do not** touch the `version` field in [package.json](package.json).
* **Do not** commit any generated files, unless already in the repo. If absolutely necessary, explain why.
* **Do not** create any top level files or directories. If absolutely necessary, explain why and update [.npmignore](.npmignore).

## License

By contributing your code, you agree to license your contribution under our [LICENSE](LICENSE).

[gitflow-post]: <http://nvie.com/posts/a-successful-git-branching-model/>
[gitflow-tool]: <https://github.com/nvie/gitflow>
[editorconfig]: <http://editorconfig.org/>
