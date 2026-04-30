# Privacy and Compliance

Scope boundaries for this campus carpool matching MVP:

- 只做信息撮合
- 不做网约车经营
- 不抽佣
- 不托管资金
- 联系方式默认隐藏
- 查看联系方式写审计
- 过期/取消/隐藏行程不展示联系方式

## Data handling

- Public list/detail responses do not include `contactType` or `contactValue`.
- `contactView` reveals contact data only after an explicit tap and writes an audit record to `contactViews`.
- Trips with `expired`, `cancelled`, or `hidden` status must not reveal contact details.
