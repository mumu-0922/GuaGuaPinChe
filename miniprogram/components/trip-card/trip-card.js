const { formatTripTime } = require('../../utils/date');

Component({
  properties: {
    trip: {
      type: Object,
      value: {}
    }
  },
  methods: {
    formatTime(earliestTime, latestTime) {
      if (!earliestTime) return '\u65f6\u95f4\u5f85\u5b9a';
      return formatTripTime(earliestTime, latestTime);
    },
    openTrip() {
      this.triggerEvent('open', { id: this.properties.trip._id });
    }
  }
});
