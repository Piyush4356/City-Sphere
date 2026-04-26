const express = require('express');
const router = express.Router();
const { getCitySchedule, getCityServicePoints } = require('../controllers/serviceScheduleController');

router.get('/schedule/:cityName', getCitySchedule);
router.get('/points/:cityName', getCityServicePoints);

module.exports = router;
