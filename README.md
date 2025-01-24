# ripview
A recreation of the popular transport app built on a Next.Js stack, porting into the Transport NSW apis.

# Setting up TPNSW API key
As the api key used to query TPNSW servers is private, this is how you can set up your codebase to correctly include your personal API key. 

You can create your own API key by following the how to create a TPNSW API key website linked below, or [here](https://opendata.transport.nsw.gov.au/developers/userguide).

To configure your api key, observe `ripview/env.dist`. This is a file that contains the format for the `.env` file you will be creating. Inside `env.dist`, you will observe this line:
```bash
TPNSWAPIKEY="apikey {yourKeyHere}"
```
Simply replace "{yourKeyHere}" with your personal API key. For example, if your api key was "hello", this is what your file will look like:
```bash
TPNSWAPIKEY="apikey hello"
```

This will tell Next.Js what value to load into the environment variable.

Finally, all you will need to do is rename this file from `env.dist` into `.env`.
You can accomplish this by simply running these commands:
```bash
$ cd ripview
$ mv env.dist .env
```
This will rename the file into a format that the Next.Js environment will know to check in for environment variables.

# Current way to start the app and development server:
1.  There is a directory called nextjs-blog which is home to all of our NextJS files. CD into this (run the following command in terminal):
```bash 
$ cd ripview 
```

2. To start the server, you can run the following command:
```bash
$ npm run dev

```

This starts a server that you can use for development on port 3000, you can access this on:
> http://localhost:3000

# Linting
Linting is done with `eslint`. To lint the NextJS project follow these steps:

1. change into the `ripview` directory with `cd ripview`
2. run eslint with `npm run lint`

After following these steps, the terminal should look something like this:
```bash
$ cd ripview
$ npm run lint

> ripview@{version_number} lint
> next lint

```

# Testing (Jest)
Testing is done with `jest`. To test the NextJS project follow these steps:
1 - change into the `ripview` directory with `cd ripview`
2 - run jest with `npm test`

After following these steps, the terminal should look something like this:
```bash
$ cd ripview
$ npm test

> ripview@{version_number} test
> jest
```

# Contributors:
- Edwin Tang ([@edwintang2005](https://github.com/Edwintang2005))
- Justin Zhang ([@jstormatic](https://github.com/jstormatic))
- Rickey Lin ([@0xRickey](https://github.com/0xRickey))
- Roger Yao ([@rogeryao824](https://github.com/rogeryao824))

# Sources and Documentation Used:
- [NextJs Setup Guide](https://nextjs.org/learn-pages-router/basics/create-nextjs-app/setup)
- [Location facilities](https://opendata.transport.nsw.gov.au/data/dataset/public-transport-location-facilities-and-operators/resource/e9d94351-f22d-46ea-b64d-10e7e238368a) documentation by Transport Open Data. This resource gives information about the locations of train stations, wharves & bus interchanges in the form of several formats such as `.csv`, `.tsv`, `.json`, `.xml`. There is also the option of using the Data API provided, note there is a limitation to 5 calls per day. 
- [How to Load Data from a File in Next.js?](https://www.geeksforgeeks.org/how-to-load-data-from-a-file-in-next-js/) documentation by GeeksForGeeks.
- [How to create a TPNSW API key](https://opendata.transport.nsw.gov.au/developers/userguide)