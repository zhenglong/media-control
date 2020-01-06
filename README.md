视频播放器，用法

``` javascript
let mediaControl = new MediaControl({
    container: $('.watch-area'),
    mediaSource: $('.watch-area .media-area video')[0] || $('.watch-area .media-area audio')[0],
    totoalTime: model.sourceTime,
    onTimeUpdateCallback: subtitleControl && subtitleControl.onTimeUpdate,
    onEndedCallback: subtitleControl && subtitleControl.hide,
    onEndedCallback2:  alertPractiseTipPop,
    isPrecisionUpdateTimeNeeded: true
  });
  mediaControl.render();
  mediaControl.componentDidMount();
```
