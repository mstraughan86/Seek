const mongoose = require('./mongoose.js');
const DATABASE = 'followers';
const FollowerToProcess = mongoose.schemas.FollowerToProcess;
const ProcessedFollower = mongoose.schemas.ProcessedFollower;

const Octokat = require('octokat');
const octo = new Octokat({
//	username: "USER_NAME",
//	password: "PASSWORD"
});

//octo.zen.read(cb)
//octo.users('philschatz').followers.fetch(cb)    // Fetch repo info
// octo.me.starred('philschatz', 'octokat.js').add(cb) // Star a repo
// octo.me.starred('philschatz', 'octokat.js').remove(cb) // Un-Star a repo

const user = 'philschatz';

function wait(ms = 1000) {
  console.log('Waiting.');
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}
const delay = time => new Promise(resolve => setTimeout(resolve, time));
function fetchAll(fn) {
  wait();
  let acc = []; // Accumulated results
  return new Promise((resolve, reject) => {
    fn().then((val) => {
      acc = acc.concat(val.items.map((i) => i.login));
      if (val.nextPage) {
        return fetchAll(val.nextPage.fetch)
          .then((val2) => {
            acc = acc.concat(val2);
            resolve(acc);
          }, reject);
      }
      else {
        resolve(acc);
      }
    }, reject);
  });
}
/*
 fetchAll(octo.users('philschatz').followers.fetch)
 .then((allFollowers) => {
 //foreach

 // is this already a friend?
 // is this already processed?
 // is this already to be processed?
 // else...
 console.log(allFollowers.length);
 return allFollowers;
 });
 */

mongoose.initialize()
  .then(mongoose.connect.bind(null, DATABASE))
  .then(fetchAll.bind(null, octo.users(user).followers.fetch))
  .then(results => {

    // Working from here:
    // https://stackoverflow.com/a/31414472/7705704


    const followers = results.map(result => ({login: result}));

    const doesFollowerExist_FollowerToProcess = login => {
      return new Promise (resolve => {
        FollowerToProcess.count({login: login}, (err, count) => {
          if (count > 0) resolve(true);
          else resolve(false);
        });
      });
    };
    const doesFollowerExist_ProcessedFollower = login => {
      return new Promise (resolve => {
        ProcessedFollower.count({login: login}, (err, count) => {
          if (count > 0) resolve(true);
          else resolve(false);
        });
      });
    };

    // I need something to be returned from this for-each.
    // maybe just use a map.

    promises = followers.map(follower => {
      const list = [
        doesFollowerExist_FollowerToProcess.bind(null, follower)(),
        doesFollowerExist_ProcessedFollower.bind(null, follower)()
      ];
      return Promise.all(list)
        .then((results)=>{
          const [exist_FollowerToProcess, exist_ProcessedFollower] = results;
          if (!exist_FollowerToProcess && !exist_ProcessedFollower) {
            return Promise.resolve(mongoose.save(FollowerToProcess).then(mongoose.save.bind(null, ProcessedFollower)));
          }
          if (!exist_FollowerToProcess) return Promise.resolve(mongoose.save(FollowerToProcess));
          if (!exist_ProcessedFollower) return Promise.resolve(mongoose.save(ProcessedFollower));
        })
    });

    return Promise.all(promises).then(()=>{
      console.log('finished here');
      return Promise.resolve(followers);
    });

    // to here.
    // I want to return a bunch of promises here. just like the highlighted code says.
    // https://stackoverflow.com/a/31414472/7705704

  })

  // .then(mongoose.save.bind(null, FollowerToProcess))
  // .then((passthrough) => {
  //     console.log('How many did we pass along?: ', passthrough.length);
  //     Promise.resolve(passthrough);
  // })
  // .then((passthrough) => {
  //   return FollowerToProcess.find({}, (err, result) => {
  //     console.log('How many " FollowerToProcess " records do we have right now?: ', result.length);
  //     Promise.resolve(passthrough);
  //   });
  // })
  // .then((passthrough) => {
  //   return ProcessedFollower.find({}, (err, result) => {
  //     console.log('How many " ProcessedFollower " records do we have right now?: ', result.length);
  //     Promise.resolve(passthrough);
  //   });
  // })

  .then(mongoose.disconnect)
  .then(delay.bind(null, 3000))
  .then(mongoose.terminate)
  .catch(console.log.bind(console));


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



	
	

