document.registerElement('a-timeline');
document.registerElement('a-timeline-group');
document.registerElement('a-timeline-animation');

AFRAME.registerComponent('animation-timeline', {
  schema: {
    direction: {type: 'string', default: 'normal'},
    loop: {
      default: 0,
      parse: function (value) {
        // Boolean or integer.
        if (value === 'true') { return true; }
        if (value === 'false') { return false; }
        return parseInt(value, 10);
      }
    },
    startEvents: {type: 'array'},
    timeline: {type: 'string'}
  },

  multiple: true,

  init: function () {
    var data = this.data;
    var i;

    this.animationIsPlaying = false;
    this.beginAnimation = this.beginAnimation.bind(this);
    this.time = 0;
    this.timeline = null;

    // Wait for start events.
    for (i = 0; i < data.startEvents.length; i++) {
      this.el.addEventListener(data.startEvents[i], this.beginAnimation);
    }
  },

  play: function () {
    if (this.data.startEvents.length) { return; }
    // Autoplay if startEvents not set.
    this.beginAnimation();
  },

  tick: function (t, dt) {
    if (!this.animationIsPlaying || !this.timeline) { return; }
    this.time += dt;
    this.timeline.tick(this.time);
  },

  /**
   * Build the anime.js timeline.
   * Begin the animation.
   */
  beginAnimation: function () {
    var i;
    var j;
    var duration;
    var longestDuration;
    var offset;
    var timelineEl;
    var timelineGroupEl;

    timelineEl = document.querySelector(this.data.timeline);
    if (timelineEl.tagName !== 'A-TIMELINE') {
      throw new Error('[animation-timeline] timeline must be a selector to <a-timeline> ' +
                      'element.');
    }

    this.animationIsPlaying = true;
    this.time = 0;
    this.timeline = AFRAME.anime.timeline({
      autoplay: false,
      direction: this.data.direction,
      loop: this.data.loop
    });

    offset = 0;  // Absolute time offset.
    for (i = 0; i < timelineEl.children.length; i++) {
      // Add group.
      if (timelineEl.children[i].tagName === 'A-TIMELINE-GROUP') {
        timelineGroupEl = timelineEl.children[i];
        longestDuration = 0;
        for (j = 0; j < timelineGroupEl.children.length; j++) {
          duration = this.addAnimationToTimeline(timelineGroupEl.children[j], offset);
          // A timeline group is finished once the longest running animation finishes.
          if (duration > longestDuration) { longestDuration = duration; }
        }
        offset += longestDuration;
        // Add additional offset if specified.
        offset += parseFloat(timelineGroupEl.getAttribute('offset') || 0, 10)
        continue;
      }

      // Add single animation.
      if (timelineEl.children[i].tagName === 'A-TIMELINE-ANIMATION') {
        offset += this.addAnimationToTimeline(timelineEl.children[i], offset);
        // Add additional offset if specified.
        offset += parseFloat(timelineEl.children[i].getAttribute('offset') || 0, 10)
      }
    }
  },

  /**
   * Add single animation to timeline.
   *
   * @param {number} offset - Absolute time offset for animation to start.
   * @returns {number} Duration.
   */
  addAnimationToTimeline: function (animationEl, offset) {
    var animationName;
    var component;
    var config;
    var els;
    var i;

    animationName = 'animation__' + animationEl.getAttribute('name');
    els = this.el.sceneEl.querySelectorAll(animationEl.getAttribute('select'));

    for (i = 0; i < els.length; i++) {
      component = els[i].components[animationName];
      component.updateConfig();
      config = cloneConfig(component.config);
      config.offset = offset;
      this.timeline.add(cloneConfig(config));
    }

    return (config.duration || 0) + (config.delay || 0);
  }
});

/**
 * Clone config. Deep clone objects and arrays. Copy over functions.
 */
function cloneConfig (config) {
  var key;
  var newConfig = {};
  for (key in config) {
    if (typeof config[key] === 'function') {
      newConfig[key] = config[key];
    } else if (typeof config[key] === 'object') {
      newConfig[key] = AFRAME.utils.clone(config[key]);
    } else {
      newConfig[key] = config[key];
    }
  }
  return newConfig;
}
