# Seek
## Introduction
#### Seek out allies in a time of great need!
If you are here wondering why am I following you and are looking for what might be the reason, this is the repository you are looking for. This project is to follow as many people as possible on Github. It is to get that number as high as I can get, using what I think is a reasonable strategy. This also served as a learning project for some new technologies I have been picking up, so there is not great emphasis on performance or efficiency. And finally, this project triples as an interview talking point: during the job screening process I am sure a proper vetting process would include looking at my Github profile, and an extra-ordinarily high following count might pique someone's interest in my favor!

## Technologies
- MongoDB + Mongoose
- NodeJS
- NightmareJS
- GithubAPI + Octokat
- ES6 Style Vanilla Promises Only!

## Installation
#### Prerequisites
- Node 6.9+
- MongoDB 3.4+
```
npm install
```

## Configuration
#### Prerequisites Your credentials:
The script requires the following information:
- Github User Account
- Github Login Email
- Github Password
Must be provided through:
- Hard coded
- .env file
#### Prerequisites Following Rate:
This how many followers the script will capture in one execution.
Must be provided through:
- Hard coded
- .env file
- Argument

## Execution
```
npm start 25
```
This will execute the script and attempt to follow 25 people starting from the provided seed value.