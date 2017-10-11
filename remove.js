require('dotenv').config();

const mongoose = require('./mongoose.js');
const COLLECTION = process.env.DB_COLLECTION;
const FollowerToProcess = mongoose.schemas.FollowerToProcess;
const ProcessedFollower = mongoose.schemas.ProcessedFollower;
const Temporary = mongoose.schemas.Temporary;

const user = process.env.SEED || asdf;
const patron = process.env.GITHUB_ACCOUNT || 'your_github_account';
const email = process.env.EMAIL || 'email@mailinator.com';
const password = process.env.PASSWORD || 'password';
const rate = process.env.RATE_LIMITER || 1; // You might be able to go as low as 0.73, but I have not tried.
let capture = process.env.CAPTURE || 100;
let chunkSize = 200;

const Octokat = require('octokat');
const octo = new Octokat({
  username: email,
  password: password
});

let Nightmare = require('nightmare');
let webDriver;
let showElectron = false;
let openDevModeElectron = false;

const loginToGithub = () => {
  return new Promise((resolve, reject) => {
    webDriver
      .viewport(1000, 1000)
      .goto('https://github.com/login')
      .wait()
      .insert('#login_field', email)
      .insert('#password', password)
      .click('.btn-primary')
      .wait('.js-select-button')
      .then(() => {
        console.log('Logged in!');
        return resolve();
      })
      .catch(error => {
        console.error('Nightmare failed to login:', error);
        return reject(error);
        //return reject({name: 'Nightmare Login', type: 'Nightmare', message: 'Nightmare failed to login' + error});
      });
  })
};
const terminateWebDriver = () => {
  return new Promise((resolve, reject) => {
    webDriver
      .end()
      .then(function () {
        console.log('Closed WebDriver');
        return resolve();
      })
  })
};
const initializeWebDriver = () => {
  webDriver = Nightmare({
    show: showElectron,
    openDevTools: openDevModeElectron
  });
};

const clearTemporaryCollection = () => {
  return Temporary.find({})
    .then((followers) => {
      const promises = followers.map(follower => follower.remove());
      Promise.all(promises)
        .then(() => {
          console.log('Cleared Temporary Followers.');
          return;
        });
    });
};

const chunk = (array, chunkSize) => {
  const chunks = [];
  for (let i=0; i<array.length; i+=chunkSize)
    chunks.push(array.slice(i,i+chunkSize));
  return chunks;
};
const range = (start, end) => Array.from({length: (end - start + 1)}, (v, k) => k + start);
const wait = (s = rate) => {
  console.log('Waiting. ', s);
  ms = s * 1000;
  let start = new Date().getTime();
  let end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
};
const delay = time => new Promise(resolve => setTimeout(resolve, time));

const reducePromiseArray = (promises) => {
  return promises
    .reduce((chain, promise) => chain.then(promise), Promise.resolve())
    .then(result => {
      console.log('Reduce Promise Array complete.');
      return result;
    });
};

const swapTemporaryFollowers = () => {
  return Temporary.find({})
    .then((followers) => {
      const followersToSave = followers.map((obj) => {return {login: obj.login}});
      return new Promise(resolve => {
        mongoose.save(FollowerToProcess, followersToSave)
          .then(() => {
            const promises = followers.map(follower => follower.remove());
            Promise.all(promises)
              .then(() => {
                console.log('Finished swapping Temporary followers to the FollowerToProcess list');
                return resolve();
              });
          });
      });
    });
};
const removeUserFrom = (Collection, user) => {
  console.log(`   ${user}    removeUserFrom    ${Collection.collection.name}`);
  // transform user to model with Get and collection

  return new Promise((resolve) => {
    Collection.findOne({login: user})
      .then(result => {
        if (result) {
          return result.remove()
            .then(() => {return resolve(user)});
        }
        else resolve(user);
      });
  });


};
const addUserTo = (Collection, user) => {
  console.log(`   ${user}    addUserTo         ${Collection.collection.collectionName}`);

  return new Promise((resolve) => {
    Collection.findOne({login: user}, (err, result) => {
      if (result) return resolve(user);
      else {
        return mongoose.save(Collection, [{login: user}])
          .then(() => {return resolve(user)});
      }
    })
  });

};
const followGithubUser = (user) => {

  console.log('~~~~~~~~~~~~~~~~~ follow GithubUser', user);

  const gotoAndClick = (user) => {
    const url = 'https://github.com/' + user;
    return new Promise((resolve, reject) => {
      webDriver
        .viewport(1000, 1000)
        .goto(url)
        .wait()
        .click('.follow button.js-user-profile-follow-button')
        .then(function () {
          console.log('Followed a user @ ', url);
          return resolve(user);
        })
        .catch(function (error) {
          console.error('Nightmare failed:', error);
          console.error('Attempting to recover...');

          return removeUserFrom(FollowerToProcess, user)
            .then(seedFollower)
            .then(fetchAllFollowers)
            .then(doFollowersAlreadyExist)
            .then(followGithubUser)
            .then(resolve);
        });
    })

  };

  if (user.length > 0) return gotoAndClick(user);
  else {
    return FollowerToProcess.findOne({}, (err, result) => {
      console.log('Getting a new follower from the "FollowerToProcess" List.');
      return gotoAndClick(result.login);
    });
  }

};
const doFollowersAlreadyExist = ([results, user]) => {

  if (results.length > chunkSize) {

    const splitResults = chunk(results, chunkSize);
    const promises = [];
    splitResults.forEach(chunk=> promises.push(doFollowersAlreadyExist.bind(null, [chunk, user])));

    return reducePromiseArray(promises)
      .then(() => {
        console.log(`-------==<<      CHUNK by ${chunkSize} FINISHED.      >>==-------`);
        return user;
      });

  }

  const followers = results.map(result => ({login: result}));

  const doesFollowerExist = (Collection, follower) => {
    return Collection.count({login: follower.login})
      .then(count => count > 0);
  };
  const isFollowerPatron = follower => (patron == follower);

  const promises = followers.map(follower => {
    const list = [
      doesFollowerExist.bind(null, FollowerToProcess, follower)(),
      doesFollowerExist.bind(null, ProcessedFollower, follower)(),
      isFollowerPatron.bind(null, follower)()
    ];

    return (()=>{
      return new Promise(resolve => {
        Promise.all(list)
          .then(results => {
            const [exist_FollowerToProcess, exist_ProcessedFollower, is_Patron] = results;
            if (!exist_FollowerToProcess && !exist_ProcessedFollower && !is_Patron) {
              resolve(mongoose.save(Temporary, follower));
            }
            else {
              console.log('Already in the system:   ', follower.login);
              resolve('Already in the system');
            }
          })
      });
    });
  });

  console.log('-------------------------- # of Followers Processing now:     ', promises.length);

  return reducePromiseArray(promises)
    .then(() => {
      console.log('Finished evaluating followers! They either exist or don\'t!');
      return user;
    });
};
const fetchAll = (func, user) => {
  wait();
  let acc = []; // Accumulated results
  return new Promise((resolve, reject) => {
    func()
      .catch((err) => {
        console.log('Previous User DID NOT EXIST! ', user);
        return removeUserFrom(FollowerToProcess, user)
          .then(seedFollower)
          .then(fetchAllFollowers)
          .then(resolve);
      })
      .then((val) => {
        acc = acc.concat(val.items.map((i) => i.login));
        if (val.nextPage) {
          return fetchAll(val.nextPage.fetch)
            .then((val2) => {
              acc = acc.concat(val2);
              resolve(acc);
            }, reject);
        }
        else resolve(acc);
      }, reject);
  });
};
const fetchAllFollowers = user => {
  console.log('Fetching followers for       ->  ', user);

  return fetchAll(octo.users(user).followers.fetch, user)
    .then(results => [results, user]);
};
const seedFollower = () => {
  return FollowerToProcess.findOne({})
    .then(result => {
      if (result) {
        if (result.login == patron) {
          return removeUserFrom(FollowerToProcess, result.login)
            .then(seedFollower);
        }
        return result.login;
      }
      else return user;
    });
};



const processMultipleUnfollows = (count) => {
  const processOneFollower = [
    ()=>{console.log('\n\n\n______________________________________________________▂▃▅▇█▓▒░۩۞۩    START    ۩۞۩░▒▓█▇▅▃▂')},
    seedFollower,
    fetchAllFollowers,
    doFollowersAlreadyExist,
    followGithubUser,
    addUserTo.bind(null, ProcessedFollower),
    removeUserFrom.bind(null, FollowerToProcess),
    swapTemporaryFollowers,
    ()=>{console.log('______________________________________________________▂▃▅▇█▓▒░۩۞۩     END     ۩۞۩░▒▓█▇▅▃▂')}
  ];

  let promisedWork = [];
  range(1, count).forEach(() => {promisedWork = promisedWork.concat(processOneFollower)});


  return reducePromiseArray(promisedWork)
    .then(() => console.log('\n\n_____________________________________________________▂▃▅▇█▓▒░۩۞۩    FINISH    ۩۞۩░▒▓█▇▅▃▂'));

};



const args = process.argv;
if (args.length > 2) {
  capture = parseInt(args[2]);
}

mongoose.initialize()
  .then(mongoose.connect.bind(null, COLLECTION))
  .then(clearTemporaryCollection)

  .then(initializeWebDriver)
  .then(loginToGithub)

  .then(() => console.log('\n\n\n'))
  .then(() => {
    return ProcessedFollower.find({})
      .then(result => {
        console.log('ProcessedFollower : ', result.length);
        const unfollowed = result.map(() => {
          // figure out how to do this.
        });
        console.log('ProcessedFollower Unfollowed: ', unfollowed.length);
      });
  })
  .then(() => console.log('\n\n\n'))

  .then(processMultipleUnfollows.bind(null, capture))

  .then(() => console.log('\n\n\n'))
  .then(() => {
    return ProcessedFollower.find({})
      .then(result => {
        console.log('ProcessedFollower : ', result.length);
        const unfollowed = result.map(() => {
          // figure out how to do this.
        });
        console.log('ProcessedFollower Unfollowed: ', unfollowed.length);
      });
  })
  .then(() => console.log('\n\n\n'))

  .then(terminateWebDriver)
  .then(mongoose.disconnect)
  .then(delay.bind(null, 3000))
  .then(mongoose.terminate)
  .then(() => {console.log(`${capture}    ۩۞۩░▒▓█▇▅▃▂_____________________________________________________▂▃▅▇█▓▒░۩۞۩    ${capture}`);})
  .catch((error)=>{
    Promise.resolve()
      .then(() => console.log('ERRORED: ', error))
      .then(terminateWebDriver)
      .then(mongoose.disconnect)
      .then(delay.bind(null, 3000))
      .then(mongoose.terminate)
  });

/*

 Table: PROCESSED
 Table: TO PROCESS

 Get "TO PROCESS" USER.
 ^* Find all Followers
 Loop>
 If user is not already in the FRIEND list. (Query against FRIEND List) (Make FRIEND List into PROCESSED List) // https://stackoverflow.com/questions/27482806/check-if-id-exists-in-a-collection-with-mongoose
 If user is not already in the TO PROCESS list. (Query against TO PROCESS List)
 If user is not already in the PROCESSED list. (Query against PROCESSED List)
 Add to TEMP list.
 Loop>

 ^* Follow (This should be NightmareJS);
 Remove User from TO PROCESS list.
 Add TEMP list to TO PROCESS list.
 Add USER to PROCESSED list.

 ... DONE!
 (add in more details, like the mongodb calls.)

 */

/*
initialization stuff

get user from processed list. {unfollow: {$exists: false}}
go to their page
unfollow
update their stuff to do {unfollow: true}
save processed list.

Repeat x however many.


 */