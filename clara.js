AFRAME.registerComponent('clara', {  
  rnPostMessage: function (data) {
    // FIXME: this is WKWebView; also make work with plain WebView
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.reactNative && 
    window.webkit.messageHandlers.reactNative.postMessage(data);
  },        

  currentFramePointCloud: function () { this.rnPostMessage('currentFramePointCloud'); },
  
  analyzeCurrentFrame: function (modelName) { this.rnPostMessage('analyzeCurrentFrame:' + modelName); },

  barcodesCurrentFrame: function () { this.rnPostMessage('barcodesCurrentFrame'); },
  
  voiceAvailable: function () { this.rnPostMessage('voiceAvailable'); },
  voiceStart: function () { this.rnPostMessage('voiceStart'); },
  voiceStop: function () { this.rnPostMessage('voiceStop'); },
  voiceCancel: function () { this.rnPostMessage('voiceCancel'); },
  
  speak: function (txt) { this.rnPostMessage('speak:' + txt); },
  stopSpeaking: function () { this.rnPostMessage('stopSpeaking'); },
  
  // TODO: improve interface e.g. callback function or promise  
  getCompassHeading: function () { this.rnPostMessage('getCompassHeading'); },
  startCompass: function (delta) { this.rnPostMessage('startCompass:' + (delta !== undefined ? delta : '')); },
  stopCompass: function () { this.rnPostMessage('stopCompass'); }
});

AFRAME.registerComponent('clara-pointcloud', {
  schema: {
    visualize: {default: true}  
  },
  
  init: function () {
    var self = this;

    // Keep reference to clara element.
    // NOTE: That component may not be attached yet within this init function.
    this.claraEl = document.querySelector('[clara]');

    // Define maximum number of points in the cloud.
    // For ARKit, this does not need to be that high.
    this.maxPoints = 1000;

    // Allocate array of position coordinates.
    this.points = new Float32Array(this.maxPoints * 3);
    
    // Create the points object.
    this.pointsObject = new THREE.Points(new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0xff00ffff,
        size: 0.01,            
        sizeAttenuation: true,
        depthTest: false, // set to true to let objects occlude
        depthWrite: false}));
    
    // Add array of position coordinates to the geometry.
    this.pointsObject.geometry.addAttribute('position', new THREE.BufferAttribute(this.points, 3));
    
    // Add listener to handle point cloud event.
    this.claraEl.addEventListener('currentframepointcloud', function (evt) {
      // Copy into our points array.
      var points = evt.detail.points;
      self.points.set(points);      
      
      // If visualizing, set draw range and flag for update.
      if (self.data.visualize) {
        self.pointsObject.geometry.setDrawRange(0, Math.min(points.length, self.maxPoints*3));
        self.pointsObject.geometry.attributes.position.needsUpdate = true;
      }
      // Emit an event in case custom behavior is desired.
      self.el.emit('pointcloudupdated', {points: points});
    });
  },
  
  update: function (oldData) {
    if (!oldData || this.data.visualize !== oldData.visualize) {
      if (this.data.visualize) {        
        // Add the points object to the entity.
        this.el.setObject3D('points', this.pointsObject);    

        // Make sure pointcloud is not culled, even if origin is not visible.
        this.el.object3D.frustumCulled = false;
        this.pointsObject.frustumCulled = false;        
      } else {
        // Remove the points object from the entity.
        this.el.removeObject3D('points');
        
        // Set the draw range to zero i.e. none of the points (yet).
        this.pointsObject.geometry.setDrawRange(0, 0);
      }
    }
  },

  tick: function () {
    // If we don't have a reference to the component, try and get one.
    if (!this.clara) { this.clara = this.claraEl.components['clara']; }

    // If we have a reference, and the method exists, request point cloud data.
    this.clara && this.clara.currentFramePointCloud && this.clara.currentFramePointCloud();
  }
});