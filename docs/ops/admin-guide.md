# Admin Guide

## Daily queue

- 每天检查 reports.status=open
- 确认黑车/骚扰/虚假行程后将 trips.status 改为 hidden
- 处理后将 reports.status 改为 reviewed 或 rejected
- 未认证账号自驾信息优先检查

## CloudBase manual acceptance

- 上传云函数 userEnsure/tripCreate/tripList/tripDetail/contactView/tripUpdateStatus/reportCreate
- 创建集合 users/trips/contactViews/reports
- 创建 indexes.json 中列出的索引
- 广场可加载
- 发布可成功
- 详情默认隐藏联系方式
- 点击显示联系方式后 contactViews 有记录
- 举报后 reports 有记录
- 我的页面可把本人行程设为已满
- 已满行程从广场 open 列表消失

