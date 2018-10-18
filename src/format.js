import { capitalize } from "./vizabiUtils";

const formats = {
    "year": { data: utcFormat("%Y"),            ui: utcFormat("%Y") },
    "month": { data: utcFormat("%Y-%m"),         ui: utcFormat("%b %Y") }, // month needs separator according to ISO to not confuse YYYYMM with YYMMDD
    "day": { data: utcFormat("%Y%m%d"),        ui: utcFormat("%c") },
    "hour": { data: utcFormat("%Y%m%dT%H"),     ui: utcFormat("%b %d %Y, %H") },
    "minute": { data: utcFormat("%Y%m%dT%H%M"),   ui: utcFormat("%b %d %Y, %H:%M") },
    "second": { data: utcFormat("%Y%m%dT%H%M%S"), ui: utcFormat("%b %d %Y, %H:%M:%S") },
    "week": { data: weekFormat(),    ui: weekFormat() },   // %Yw%W d3 week format does not comply with ISO
    "quarter": { data: quarterFormat(), ui: quarterFormat() } // %Yq%Q d3 does not support quarters
};

function utcFormat(f) {
    const format = d3.utcFormat(f);
    format.parse = d3.utcParse(f);
    return format;
};

/*
 * Week Format to format and parse dates
 * Conforms with ISO8601
 * Follows format: YYYYwWW: 2015w04, 3845w34, 0020w53
 */
function weekFormat() {

    const format = function(d) {
      return formatWeekYear(d) + "w" + formatWeek(d);
    };
  
    format.parse = function parse(dateString) {
      const matchedDate = dateString.match(/^(\d{4})w(\d{2})$/);
      return matchedDate ? getDateFromWeek(matchedDate[1], matchedDate[2]) : null;
    };
  
    const formatWeekYear = function(d) {
      if (!(d instanceof Date)) d = new Date(+d);
      return new Date(+d + ((4 - (d.getUTCDay() || 7)) * 86400000)).getUTCFullYear();
    };
  
    const formatWeek = function(d) {
      if (!(d instanceof Date)) d = new Date(+d);
      const quote = new Date(+d + ((4 - (d.getUTCDay() || 7)) * 86400000));
      const week = Math.ceil(((quote.getTime() - quote.setUTCMonth(0, 1)) / 86400000 + 1) / 7);
      return week < 10 ? "0" + week : week;
    };
  
    const getDateFromWeek = function(p1, p2) {
      const week = parseInt(p2);
      const year = p1;
      const startDateOfYear = new Date(); // always 4th of January (according to standard ISO 8601)
      startDateOfYear.setUTCFullYear(year);
      startDateOfYear.setUTCMonth(0);
      startDateOfYear.setUTCDate(4);
      const startDayOfWeek = startDateOfYear.getUTCDay() || 7;
      const dayOfWeek = 1; // Monday === 1
      const dayOfYear = week * 7 + dayOfWeek - (startDayOfWeek + 4);
  
      let date = formats["year"].data.parse(year);
      date = new Date(date.getTime() + dayOfYear * 24 * 60 * 60 * 1000);
  
      return date;
    };
  
    return format;
  
}
  
/*
* Quarter Format to format and parse quarter dates
* A quarter is the month%3
* Follows format: YYYYqQ: 2015q4, 5847q1, 0040q2
*/
function quarterFormat() {
  
    const format = function(d) {
      return formats.year.data(d) + "q" + formatQuarter(d);
    };
  
    format.parse = function(dateString) {
      const matchedDate = dateString.match(/^(\d{4})q(\d)$/);
      return matchedDate ? getDateFromQuarter(matchedDate[1], matchedDate[2]) : null;
    };
  
    const formatQuarter = function(d) {
      if (!(d instanceof Date)) d = new Date(+d);
      return ((d.getUTCMonth() / 3) | 0) + 1;
    };
  
    const getDateFromQuarter = function(p1, p2) {
      const quarter = parseInt(p2);
      const month = 3 * quarter - 2; // first month in quarter
      const year = p1;
      return formats.month.data.parse([year, (month < 9 ? "0" : "") + month].join("-"));
    };
  
    return format;
  }  

export function getFormat(key) {
    return formats[key] ? formats[key] : ((_format) => {
      _format.data.parse = d => d;
      _format.ui.parse = d => d;
      return _format;
    })({
        data: d => d,
        ui: d => d
    });
};

/* auto-determines unit from timestring */
export function findFormat(timeString) {
    const keys = Object.keys(formats);
    for (let i = 0; i < keys.length; i++) {
      let dateObject = formats[keys[i]].data.parse(timeString);
      if (dateObject) return { unit: keys[i], time: dateObject, type: "data" };
      dateObject = formats[keys[i]].ui.parse(timeString);
      if (dateObject) return { unit: keys[i], time: dateObject, type: "ui" };
    }
    return null;
};

/**
 * gets the d3 interval and stepsize for d3 time interval methods
 * D3's week-interval starts on sunday and d3 does not support a quarter interval
 **/
export function getIntervalAndStep(unit, step) {
    let d3Interval, _step;
    switch (unit) {
    case "week": d3Interval = "monday"; _step = step; break;
    case "quarter": d3Interval = "month"; _step = step * 3; break;
    default: d3Interval = unit; _step = step; break;
    }
    return { interval: d3["utc"+ capitalize(d3Interval)], step: _step };
};