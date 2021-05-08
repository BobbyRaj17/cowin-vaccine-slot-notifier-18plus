'use strict';
const axios = require('axios')
const strftime = require('strftime')
const range = 7;
let n = 0;
let dates = []
const sampleUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'

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

const districtsList = Object.keys(districtCodeMapper["districts"]);

while (n < range){
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + n)
  // console.log(strftime('%d-%m-%Y', nextDate)) 
  dates.push(strftime('%d-%m-%Y', nextDate))
  n++;
}

module.exports.cowinNotifier = async (event) => {
  
  function sendSms(centerID, hospitalName, districtName, pincode, minAgeLimit, availableCapacity, vaccineName, date) {
    // console.log(`URGENT: \n Found a slot for vaccine \n center_id: ${centerID} \n Hospital Name: ${hospitalName} \n district_name: ${districtName} \n min_age_limit: ${minAgeLimit} \n Available_capacity: ${availableCapacity} \n date(dd-mm-yyyy): ${date}`);
    client.messages
        .create({
            body: `URGENT: \n Found a slot for vaccine \n center_id: ${centerID} \n Hospital Name: ${hospitalName} \n district_name: ${districtName} \n pincode: ${pincode} \n min_age_limit: ${minAgeLimit} \n Available_capacity: ${availableCapacity} \n vaccine name: ${vaccineName} \n date(dd-mm-yyyy): ${date}`,
            from: '+13523663120',
            to: '+918792169789'
        })
        .then(message => console.log("Msg Sent :: " + message.sid));
  }

  function apiQueryCowin(districtID, date) {
      return new Promise((resolve, reject) => {
        const cowinBaseUrl='https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?'  
        const cowinQuery=`district_id=${districtID}&date=${date}`
        const cowinUrl= cowinBaseUrl + cowinQuery
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
          if (!err.response.status) {
              console.log("ERROR Encountered calling :: " + cowinUrl, err);
              reject(err);
          } else {
              console.log("ERROR Encountered calling :: " + cowinUrl, err.response.status);
              reject(err.response.status);
          }
        })
      })
  }


  async function main() {
      try {
          const currentDateTime = new Date()
          console.log(`#### ${currentDateTime}  running cowin a task every 1 minute ####`); 
          let district, date, cowinResponse, cowinSessions;
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
                                      sendSms(cowinResponse.center_id, cowinResponse.name, cowinResponse.district_name, cowinResponse.pincode, cowinSessions.min_age_limit, cowinSessions.available_capacity, cowinSessions.vaccine, cowinSessions.date);
                                      console.log('********')
                                  }
                              }
                      }
                  })
                  .catch((err) => {
                      console.log("ERROR Encountered calling :: ", err);
                  })
              }
          }
          console.log('#### COWIN API VACCINE SLOT POLLING TASK COMPLETED ####');
      }
      catch (error) {
          console.error(error);
      }
      return `COWIN Polling Completed`
  }

  await main().then(result => console.log(`${result}`));
  // return {
  //   statusCode: 200,
  //   body: JSON.stringify(
  //     {
  //       message: 'Go Serverless v1.0! Your function executed successfully!',
  //       input: event,
  //     },
  //     null,
  //     2
  //   ),
  // };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
