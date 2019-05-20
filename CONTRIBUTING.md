# Contributing to MTG Arena Tool

:+1: :tada: :sparkling_heart: Thanks for your interest! :sparkling_heart: :tada: :+1:

The following is a set of guidelines for contributing to MTG Arena Tool, hosted
[here on GitHub](https://github.com/Manuel-777/MTG-Arena-Tool/). These are just
guidelines, not rules. Use your best judgment, and
feel free to propose changes to this document in a pull request.

Note that MTG Arena Tool is an evolving project, so expect things to change over
time as the team learns, listens, and refines how we work with the community.

#### Table Of Contents

- [What should I know before I get started?](#what-should-i-know-before-i-get-started)
  * [Code of Conduct](#code-of-conduct)

- [How Can I Contribute?](#how-can-i-contribute)
  * [Reporting Bugs](#reporting-bugs)
  * [Suggesting Enhancements](#suggesting-enhancements)
  * [Set Up Your Machine](#set-up-your-machine)

## What should I know before I get started?

### Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](../CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to [manuel.etchegaray7@gmail.com](mailto:manuel.etchegaray7@gmail.com).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for MTG Arena Tool.
Following these guidelines helps maintainers and the community understand your
report :pencil:, reproduce the behavior :computer: :computer:, and find related
reports :mag_right:.

Before creating bug reports, please check [this list](#before-submitting-a-bug-report)
as you might find out that you don't need to create one. When you are creating
a bug report, please [include as many details as possible](#how-do-i-submit-a-good-bug-report).

#### Before Submitting A Bug Report

**Perform a [cursory search](https://github.com/Manuel-777/MTG-Arena-Tool/issues)**
to see if the problem has already been reported. If it does exist, add a
:thumbsup: to the issue to indicate this is also an issue for you, and add a
comment to the existing issue if there is extra information you can contribute.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/).

Simply create an issue on the [MTG Arena Tool issue tracker](https://github.com/Manuel-777/MTG-Arena-Tool/issues/new).

The information we are interested in includes:

 - details about your environment - which build, which operating system
 - details about reproducing the issue - what steps to take, what happens, how
   often it happens
 - other relevant information - log files, screenshots, etc

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for
MTG Arena Tool, including completely new features and minor improvements to
existing functionality. Following these guidelines helps maintainers and the
community understand your suggestion :pencil: and find related suggestions
:mag_right:.

Before creating enhancement suggestions, please check [this list](#before-submitting-an-enhancement-suggestion)
as you might find out that you don't need to create one. When you are creating
an enhancement suggestion, please [include as many details as possible](#how-do-i-submit-a-good-enhancement-suggestion).

#### Before Submitting An Enhancement Suggestion

**Perform a [cursory search](https://github.com/Manuel-777/MTG-Arena-Tool/labels/enhancement)**
to see if the enhancement has already been suggested. If it has, add a
:thumbsup: to indicate your interest in it, or comment if there is additional
information you would like to add.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/).

Simply create an issue on the [MTG Arena Tool issue tracker](https://github.com/Manuel-777/MTG-Arena-Tool/issues/new).

Some additional advice:

* **Use a clear and descriptive title** for the feature request
* **Provide a step-by-step description of the suggested enhancement**
  This additional context helps the maintainers understand the enhancement from
  your perspective
* **Explain why this enhancement would be useful** to MTG Arena Tool users
* **Include screenshots and animated GIFs** if relevant to help you demonstrate
  the steps or point out the part of MTG Arena Tool which the suggestion is
  related to. You can use [this tool](http://www.cockos.com/licecap/) to record
  GIFs on macOS and Windows
* **List some other applications where this enhancement exists, if applicable**

### Set Up Your Machine

MTG Arena Tool is developed using Electron JS, To get started simply clone this repo and install:

```
git clone https://github.com/Manuel-777/MTG-Arena-Tool
cd MTG-Arena-Tool
npm install
npm start
```

You can toggle developer tools for debugging using `Shift+Alt+D`, or using `F12` if you run from source.

#### Optional Git Hooks
You can optionally install git hooks to help with code formatting and
ensuring that your commits build successfully. Note that these can
sometimes take a moment to run and will potentially modify files in your
working tree. For more information, [see the git hooks documentation.](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

##### Pre-Commit Hook
This automatically reformats all files with staged changes to match the
project guidelines. WARNING: this will overwrite any previous custom
git hook.

To install (or update), simply run the script in a terminal:
```
./git-pre-commit
```
This will run the hook and place a copy in your `.git/hooks/` folder.
Future commits will always run the hook.

To uninstall:
```
rm .git/hooks/pre-commit
```

##### Pre-Push Hook
This automatically checks all modified files against the project
guidelines and only allows you to push valid commits. WARNING: this will
overwrite any previous custom git hook.

To install (or update), simply run the script in a terminal:
```
./git-pre-push
```
This will run the hook and place a copy in your `.git/hooks/` folder.
Future commits will always run the hook.

To uninstall:
```
rm .git/hooks/pre-push
```
