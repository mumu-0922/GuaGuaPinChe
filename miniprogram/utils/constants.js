const LOCATION_GROUPS = [
  { label: '校区', icon: '🏫', options: ['长安校区', '友谊校区', '西建草堂', '西建雁塔'] },
  { label: '高铁/火车站', icon: '🚄', options: ['西安北站', '西安站', '鄠邑站'] },
  { label: '地铁站', icon: '🚇', options: ['西电地铁站', '常宁宫地铁站'] },
  { label: '机场', icon: '✈️', options: ['咸阳机场'] }
];

const LOCATION_ALIASES = {
  西北工业大学长安校区: '长安校区',
  西工大长安校区: '长安校区',
  西北工业大学友谊校区: '友谊校区',
  西工大友谊校区: '友谊校区',
  机场: '咸阳机场',
  西安咸阳国际机场: '咸阳机场',
  北客站: '西安北站'
};

const CONTACT_TYPES = ['qq', 'wechat', 'phone'];
const TRIP_STATUSES = ['open', 'full', 'cancelled', 'expired', 'hidden'];
module.exports = { LOCATION_GROUPS, LOCATION_ALIASES, CONTACT_TYPES, TRIP_STATUSES };
