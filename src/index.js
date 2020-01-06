import './index.scss';
import Tpl from './index.html';
import Mustache from 'mustache';
import TplWatchingCompleted from './watching-completed.html';

let ua = navigator.userAgent.toLowerCase();
const isAndroidX5 = ua.indexOf('android') > -1 && ua.indexOf('mqqbrowser') > -1 && ua.indexOf('mobile') > -1;
var clickLimitTime = 300; //点击视频或者音频的时间间隔
var autoHideTime = 3000; //控制条不操作时间阈值，超过这个时间自动隐藏
var setTimerOutMask = null;
export default class MediaControl {
  constructor(props) {
    this.mediaSource = props.mediaSource;
    this.container = props.container;
    this.timer = null;
    this.state = {
      // 如果需要更高精度的currentTime更新频率，则使用该参数
      isPrecisionUpdateTimeNeeded: props.isPrecisionUpdateTimeNeeded,
      startTime: props.startTime,
      passedTime: 0.0,
      totalTime: props.totalTime, // 单位：秒
      isSeekingTrack: false,
      hasSetParentContainerSize: false
    };
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onTimeUpdateCallback = props.onTimeUpdateCallback; //指定视频播放回调处理
    this.onAfterPlayCallback = props.onAfterPlayCallback; // 开始播放之后回调函数
    this.onEndedCallback = props.onEndedCallback; // 播放结束时回调函数
  }

  startUpdateTimeTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.onTimeUpdateCallback(this.mediaSource.currentTime);
    }, 100);
  }

  stopUpdateTimer() {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  onPlay() {
    if (this.savedVideoUrl && (this.mediaSource.src != this.savedVideoUrl)) {
      this.mediaSource.src = this.savedVideoUrl;
      this.savedVideoUrl = null;
      setTimeout(() => {
        this.mediaSource.play();
        if (this.savedCurrentTime) {
          let oldVolumn = this.mediaSource.volume;
          this.mediaSource.volume = 0;
          setTimeout(() => {
            this.mediaSource.volume = oldVolumn;
            this.mediaSource.currentTime = this.savedCurrentTime;
            this.savedCurrentTime = null;
          }, 400);
        } else {
          this.onAfterPlayCallback && this.onAfterPlayCallback();
        }
      }, 100);
    } else {
      this.mediaSource.play();
      this.onAfterPlayCallback && this.onAfterPlayCallback();
    }

    let audioAnimation = $('.audio-animation', this.container);
    if (audioAnimation.length && !audioAnimation.hasClass('visible')) {
      audioAnimation.addClass('visible');
    }
  }

  onStop(isShowMaskImmediate) {
    if (isAndroidX5 && (this.mediaSource.tagName == 'VIDEO') && (!this.savedVideoUrl)) {
      this.savedVideoUrl = this.mediaSource.src;
      $('.media-control .btn-play-state', this.container).removeClass('pause').addClass('play');
      if (isShowMaskImmediate) {
        // 如果是听关键句子，则不用记录上次录音时间，直接重头开始播放
        $('.media-control-mask', $('.oral-practise')[0]).removeClass('hide');
      } else {
        this.savedCurrentTime = this.mediaSource.currentTime;
      }
      this.mediaSource.src = '';
    } else {
      this.onPause();
    }
  }


  onPause() {
    // 如果已经处于暂停状态，则直接返回
    if(!this.mediaSource) return;
    if (this.mediaSource.paused) {
      return;
    }
    if ($('.oral-practise').hasClass('active')) { //只针对核心口语练习
      clearTimeout(setTimerOutMask);
      setTimerOutMask = setTimeout(function () {
        $('.media-control-mask', $('.oral-practise')[0]).removeClass('hide');
      }, 150);
    }
    this.mediaSource.pause();
    let audioAnimation = $('.audio-animation', this.container);
    if (audioAnimation.length && audioAnimation.hasClass('visible')) {
      audioAnimation.removeClass('visible');
    }
    // $('.media-control .btn-play-state').toggleClass('play pause');
  }

  static displayedTimeText(seconds) {
    return `${MediaControl.paddingLeft((seconds / 60) >> 0)}:${MediaControl.paddingLeft(seconds % 60)}`;
  }

  static paddingLeft(val) {
    return val < 10 ? `0${val}` : `${val}`;
  }

  updatePastTime(newVal) {
    newVal = newVal >> 0;
    if (this.state.passedTime == newVal) {
      return;
    }
    this.state.passedTime = newVal;
    $('.media-control .past-play-time', this.container).text(MediaControl.displayedTimeText(this.state.passedTime));
    let { totalTime } = this.state;
    $('.media-control .media-progress-bar-inner', this.container).css('width', `${((Math.min(newVal, totalTime) * 100 / totalTime)).toFixed(2)}%`);
  }

  componentDidMount() {
    //3s后自动隐藏视频控制条
    var autoHideControlBar = null;
    this.state.hasSetParentContainerSize = true;
    var controBar = $('.media-control-area .media-control', this.container); //控制条 
    const clickToPlay = btn => { //播放和暂停视频
      autoHideBar();

      if (btn.hasClass('play')) {
        this.onPlay();
      } else {
        this.onPause();
      }
    }

    function autoHideBar() {
      clearTimeout(autoHideControlBar);
      controBar.show();
      autoHideControlBar = setTimeout(function () {
        controBar.hide();
      }, autoHideTime);
    }
    $('.media-control .btn-play-state', this.container).on('click', e => {
      clickToPlay($(e.currentTarget));
    });
    $('.media-control-mask .btn-big-play', this.container).on('click', e => {
      $('.media-control-mask', this.container).addClass('hide');
      $('.audio-animation-layer', this.container).addClass('start-playing');
      $('.media-control', this.container).addClass('visible');
      clickToPlay($('.media-control .btn-play-state', this.container));
    });
    // 同步播放进度条 
    if(this.mediaSource){
      this.mediaSource.onended = () => {
        // 结束时直接修改播放时间至结尾
        this.mediaSource.currentTime = 0;
        this.mediaSource.pause();
        this.updatePastTime(this.state.totalTime);

        // 如果是视频，且安卓x5内核，则隐藏video
        let videoElem = $('video', this.container);
        if (isAndroidX5 && videoElem.length) {
          videoElem.css('display', 'none');
        }

        // 如果是音频，要隐藏动效
        let audioAnimation = $('.audio-animation', this.container);
        if (audioAnimation.length && audioAnimation.hasClass('visible')) {
          audioAnimation.removeClass('visible');
          $('.audio-animation-layer', this.container).removeClass('start-playing');
        }

        console.log('音视频播放完成');

        let watchingCompleted = $('.watching-completed', this.container);
        if (watchingCompleted.length < 1) {//若已创建就不再创建
          this.container.append($(TplWatchingCompleted));
        }

        //音频重新播放控制
        $('.watching-completed .btn-replay', this.container).on('click', e => {
          $('.watching-completed', this.container).remove();
          $('.audio-animation', this.container).addClass('visible');
          $('.audio-animation-layer', this.container).addClass('start-playing');
          if ($('.btn-practise', this.container).length > 0) {
            this.seek(0);//重置视频为0开始，仅针对看视频处
          }
          videoElem.css('display', '');
          this.onPlay();
        });
        $('.watching-completed .btn-practise', this.container).on('click', e => {
          
          $('.hj-tabs .hj-tabs-bar .active').removeClass('active');
          let tabItem = $('.hj-tabs-bar li[data-target="oral-practise"]');
          tabItem.addClass('active');
          $('.hj-tabs .hj-tab-item.active').removeClass('active');
          
          let body = $('body'); 
          if(body.hasClass('novideo-important') || body.hasClass('noaudio-important')||body.hasClass('nosubt-imp-video')||body.hasClass('nosubt-imp-audio')){ 
            $(`.null-practise`).addClass('active');
          }else{ 
            $('body').toggleClass('grey-bg');
            $('.oral-practise').addClass('active');
          }
        });
        this.onEndedCallback && this.onEndedCallback();
        if (this.state.isPrecisionUpdateTimeNeeded) {
          this.stopUpdateTimer();
        }
      };

      this.mediaSource.onpause = () => {
        $('.media-control .btn-play-state', this.container).removeClass('pause').addClass('play');
        if (this.state.isPrecisionUpdateTimeNeeded) {
          this.stopUpdateTimer();
        }
      };
      this.mediaSource.onplay = () => {
        $('.media-control .btn-play-state', this.container).removeClass('play').addClass('pause');
      };
      if (this.state.isPrecisionUpdateTimeNeeded && this.onTimeUpdateCallback) {
        this.mediaSource.onplaying = this.mediaSource.seeked = () => {
          this.startUpdateTimeTimer();
        };
        this.mediaSource.onwaiting =
          this.mediaSource.onseeking = () => {
            this.stopUpdateTimer();
          }
      }

      this.mediaSource.ontimeupdate = () => {
        let currentTime = this.mediaSource.currentTime >> 0;
        this.updatePastTime(currentTime);
        this.onTimeUpdateCallback && this.onTimeUpdateCallback(this.mediaSource.currentTime);
      }
  }
    // 双击视频区域，播放或者暂停
    // 单机视频区域，唤起视频操控界面  

    function singleOrDouble(_this) {
      var videoFace = $('video', _this.container);
      //单击
      let controBarFlag = 0; //控制条的开关，默认打开控制条
      let playPauseFlag = -1;
      var touchtime = 0;
      let timer = null;

      function controBarShowOrHide() {
        clearTimeout(autoHideControlBar);
        if (controBarFlag == -1) { //hide
          controBarFlag = 0;
          controBar.hide();
        } else { //show
          controBarFlag = -1;
          controBar.show();
          autoHideBar();
        }
      }

      // 视频控制
      videoFace.on("touchstart", function () {
        if (touchtime == 0) { // //单击
          // set first click
          touchtime = new Date().getTime();
          clearTimeout(timer);
          timer = setTimeout(function () {
            // 如果300ms之后，touchtime仍然大于0，则主动触发click事件
            if (!touchtime) return;
            controBarShowOrHide();
            touchtime = 0; //清空时间储存器
          }, clickLimitTime);
        } else { // // 双击
          // compare first click to this click and see if they occurred within double click threshold
          if (((new Date().getTime()) - touchtime) < clickLimitTime) {
            // double click occurred 
            clickToPlay($('.media-control .btn-play-state', _this.container)); //模拟播放或暂停
            touchtime = 0;
            clearTimeout(timer);
            timer = null;
          } else {
            // not a double click so set as a new first click
            touchtime = new Date().getTime();
            clearTimeout(timer);
            controBarShowOrHide();
          }

        }
      });

    }
    singleOrDouble(this);

    $('.media-control .media-progress-bar-overlay', this.container).on('touchstart', e => {
      clearTimeout(autoHideControlBar);
      this.state.isSeekingTrack = true;
    }).on('touchmove', e => {
      if (!this.state.isSeekingTrack) {
        return;
      }
      let $this = $(e.currentTarget);
      let progress = e.changedTouches[0].clientX - $this.offset().left;
      let width = $this.width();
      this.seek(Math.max(Math.min(progress, width), 0) / width);
    }).on('touchend', e => {
      this.state.isSeekingTrack = false;
      autoHideBar();
    });

    $('body').on('touchend.media-control', e => {
      if (!this.state.isSeekingTrack) {
        return;
      }
      this.state.isSeekingTrack = false;
    });
  }

  /**
   * 
   * @param {*} percent 
   */
  seek(percent, isForPlayKeySentence) {
    let newCurrentTime;
    newCurrentTime = percent * this.state.totalTime;
    if (this.mediaSource) {
      if (isForPlayKeySentence) {
        // 静音，避免听到之前的声音
        let oldVolume = this.mediaSource.volume;
        this.mediaSource.volume = 0.0;

        let oldOnPlaying = this.mediaSource.onplaying;
        this.mediaSource.onplaying = () => {
          setTimeout(() => {
            this.mediaSource.currentTime = newCurrentTime;
            this.updatePastTime(newCurrentTime);
            this.mediaSource.onplaying = oldOnPlaying;
            this.mediaSource.volume = oldVolume;
          }, 500);
        }
      } else {
        this.mediaSource.currentTime = newCurrentTime;
        this.updatePastTime(newCurrentTime);
      }

    }
  }

  render() {
    if (!this.container.hasClass('media-area')) {
      this.container.addClass('media-area');
    }
    this.container.append($(`<div class="media-control-area">${
      Mustache.render(Tpl, {
        displayedTotalTime: MediaControl.displayedTimeText(this.state.totalTime)
      })
    } </div><div class="media-control-mask"><i class="btn-big-play"></i></div>`));
  }
}

window.MediaControlWidget = MediaControl;