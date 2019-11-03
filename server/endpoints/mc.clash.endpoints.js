
const express = require('express');
const router = express.Router(); 
const utility = require("../utility")
const analyze = require('../analyze');

const UserSession = require('../services/userSession');  
const mcClashServices = require('../services/mc.clash.services'); 

 

router.get('/mc/clash/getRawClashData/:mc_container_id/:ms_id/:ms_v_id', async (req, res, next) => {

  try {  
    const mc_container_id = req.params['mc_container_id']  
    const ms_id = req.params['ms_id']
    const ms_v_id = req.params['ms_v_id']  
    const clashData = analyze.getRawClashData(mc_container_id,ms_id,ms_v_id) 
    if(!clashData)
        res.status(500).end('raw clash data is null')
    else
        res.status(200).json(clashData) 
 
   } catch(e) {
      // here goes out error handler
      res.status(500).end()
  }   
}); 

module.exports =  router 
