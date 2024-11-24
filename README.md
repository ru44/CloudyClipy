# CloudyClipy

Your own clipboard in the cloud

it use gist to store your clipboard data inspired by [CloudClip](https://github.com/skywind3000/CloudClip)

## prerequisites

- nodejs
- npm or yarn or pnpm or bun
- github account
- generate a github token

## Installation

```bash
npm i -g cclip

or

yarn global add cclip

or

npx cclip

or

pnpm add -g cclip

or

bun install -g cclip
```

## Usage

so first you need to create a github token

A github access token is needed before everything, you can generate a new one from: <https://github.com/settings/tokens>

then you can use the following commands

```bash
cclip init "your-github-token"
```

it will generate a config file in your home directory with the gist id

after that you can use the following commands

when you want to copy something

```bash
cclip copy "the name of gist"
```

when you want to paste something

```bash
cclip paste "the name of gist"
```

now you will have in your clipboard the content of the gist
