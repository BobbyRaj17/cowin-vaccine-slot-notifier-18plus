const cron = require('node-cron');
const express = require('express');
const axios = require('axios')
const strftime = require('strftime')
var request = require('request');
const range = 7;
let n = 0;
let dates = []
const PORT = process.env.PORT || 5000;
const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'


// Loads environment variables from a .env file into process.env.
const dotenv = require('dotenv')
dotenv.config()

// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// let districtCodeMapper = require('./district-code-mapper.json');
let districtCodeMapper = {
    "districts": {
      "BBMP": "294",
      "Bangalore Rural": "276",
      "Bangalore urban": "265"
    }
  };

districtsList = Object.keys(districtCodeMapper["districts"]);

while (n < range){
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + n)
    // console.log(strftime('%d-%m-%Y', nextDate)) 
    dates.push(strftime('%d-%m-%Y', nextDate))
    n++;
}

function send_sms(centerID, hospitalName, districtName, vaccineName, minAgeLimit, availableCapacity, pincode, date) {
    // console.log(`URGENT: \n Found a slot for vaccine \n center_id: ${centerID} \n Hospital Name: ${hospitalName} \n district_name: ${districtName} \n min_age_limit: ${minAgeLimit} \n Available_capacity: ${availableCapacity} \n date(dd-mm-yyyy): ${date}`);
    client.messages
        .create({
            body: `URGENT: \n Found a slot for vaccine \n center_id: ${cowinResponse.center_id} \n Hospital Name: ${cowinResponse.name} \n district_name: ${cowinResponse.district_name} \n pincode: ${cowinResponse.pincode} \n min_age_limit: ${cowinSessions.min_age_limit} \n Available_capacity: ${cowinSessions.available_capacity} \n vaccine name: ${cowinSessions.vaccine} \n date(dd-mm-yyyy): ${cowinSessions.date}`,
            from: '+13523663120',
            to: '+918792169789'
        })
        .then(message => console.log("Msg Sent :: " + message.sid));
}

function apiQueryCowin(districtID, date) {
    return new Promise((resolve, reject) => {
      cowinBaseUrl='https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?'  
      cowinQuery=`district_id=${districtID}&date=${date}`
      cowinUrl= cowinBaseUrl + cowinQuery
      const configCowin = {
          method: 'get',
          url: cowinUrl,
          headers: {
              'User-Agent': sampleUserAgent
            }
      }
      axios(configCowin)
      .then((apiResultCowin) => {
        // console.log(apiResultCowin.data.centers[0])
        resolve(apiResultCowin)
      })
      .catch((err) => {
        console.log("ERROR Encountered calling :: " + cowinUrl, err.response.status);
        reject(err.response.status);
      })
    })
}


async function main() {
    try {
        for (district of districtsList){
            for(date of dates){
                await apiQueryCowin(districtCodeMapper["districts"][district], date)
                .then((apiResultCowin) => {
                    console.log(`${district} :: code is :: ${districtCodeMapper["districts"][district]} :: for date ${date}`)
                    // console.log(apiResultCowin.data.centers)
                    for (cowinResponse of apiResultCowin.data.centers){
                            for (cowinSessions of cowinResponse.sessions){  
                                if (cowinSessions.available_capacity > 0 && cowinSessions.min_age_limit === 18){
                                    console.log('********')
                                    console.log(`URGENT: \n Found a slot for vaccine \n center_id: ${cowinResponse.center_id} \n Hospital Name: ${cowinResponse.name} \n district_name: ${cowinResponse.district_name} \n pincode: ${cowinResponse.pincode} \n min_age_limit: ${cowinSessions.min_age_limit} \n Available_capacity: ${cowinSessions.available_capacity} \n vaccine name: ${cowinSessions.vaccine} \n date(dd-mm-yyyy): ${cowinSessions.date}`)
                                    send_sms(cowinResponse.center_id, cowinResponse.name, cowinResponse.district_name, cowinResponse.pincode, cowinSessions.min_age_limit, cowinSessions.available_capacity, cowinSessions.vaccine, cowinSessions.date);
                                    console.log('********')
                                }
                            }
                    }
                })
                .catch((err) => {
                    console.log("ERROR Encountered calling :: " + cowinUrl, err);
                })
            }
        }
        console.log('#### COWIN API VACCINE SLOT POLLING TASK COMPLETED ####');
    }
    catch (error) {
        console.error(error);
    }
}

function webDisplay() {
    webDisplayReturn = `COWIN API VACCINE SLOT POLLING APP is RUNING ....\n`
    return webDisplayReturn
}

app = express();

// Schedule tasks to be run on the server.
cron.schedule('* * * * *', function() {
    const currentDateTime = new Date()
    console.log(`#### ${currentDateTime} ####`); 
    console.log('running a task every 5 minute');
    main();
});

// Remove the error.log file every twenty-first day of the month.
cron.schedule('0 0 21 * *', function() {
    console.log('---------------------');
    console.log('Running Cron Job');
    fs.unlink('./error.log', err => {
      if (err) throw err;
      console.log('Error file successfully deleted');
    });
});
  

app
  .get('/', (req, res) => res.send(webDisplay()))
  .listen(PORT, () => console.log(`⚡ Listening on ${ PORT } ⚡`));


var reqTimer = setTimeout(function wakeUp() {
    request("https://cowin-18plus-notifier.herokuapp.com/", function() {
        console.log("WAKE UP DYNO");
    });
    return reqTimer = setTimeout(wakeUp, 100000);
}, 100000)
