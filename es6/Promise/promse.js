const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';

function Promise(excotur) {
  const that = this;
  that.status = PENDING;
  that.value = null;
  that.reason = null;

  that.onResolveCallBacks = []; // 成功回调数组，处理异步执行resolve
  that.onRejectCallBacks = []; //失败回调数组，处理异步reject

  const resolve = (value) => {
    if(that.status === PENDING) {
      that.value = value;
      that.status = RESOLVE;
      that.onResolveCallBacks.forEach(fn => fn(that.value))
    }
  }

  const reject = (err) => {
    if(that.status === PENDING) {
      that.reason = err;
      that.status = REJECT;
      that.onRejectCallBacks.forEach(fn => fn(that.reason))
    }
  }

  try {
    excotur(resolve, reject)
  } catch(e) {
    reject(e)
  }
}

function promiseResolve(promise2, x, resolve, reject) {
  if(promise2 === x) {
    throw Error('循环引用')
  }
  if(x instanceof Promise) {
    if(x.status === PENDING) { //如果是等待状态，继续resolve，直到状态改变
      x.then(
        y => {promiseResolve(promise2, y, resolve, reject)},
        e => {reject(e)}
      )
    } else { // 如果处于成功或聚聚态，值已经呗拆解，把值传递下午就可以了
      x.then(resolve, reject)
    }
  } else {
    resolve(x)
  }
}

Promise.prototype.then = function(onResolve, onReject) {
  const that = this;
  let promise2;

  onResolve = typeof onResolve === 'function' ? onResolve : function(v) {return v} 
  onReject = typeof onReject === 'function' ? onReject : function(e) {throw e} //错误冒泡穿透机制

  if(that.status === RESOLVE) { // 成功态
    promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          let value = onResolve(that.value) // 执行then的成功函数，取得返回值
          promiseResolve(promise2, value ,resolve, reject)
          // if(value instanceof Promise) { // 返回值为Promise是，吧当前resolve，reject传递下去，递归去除值
          //   value.then(resolve, reject) 
          // } else { // 若返回值不为Promise，把x传递下去
          //   resolve(value)
          // }
        }catch(e){
          reject(e)
        }
      })
    })
  }

  if(that.status === REJECT) { //失败太
    promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          let value = onReject(that.reason);
          promiseResolve(promise2, value ,resolve, reject)
          // if(value instanceof Promise) {
          //   value.then(resolve, reject)
          // } else {
          //   resolve(value)
          // }
        } catch(e) {
          reject(e)
        }
      })
    })
  }


  if(that.status === PENDING) { //对于异步Promise处理
    promise2 = new Promise( (resolve, reject) => {
      that.onResolveCallBacks.push(() => { //将异步压入异步成功回调
        setTimeout(() => {
          try {
            let value = onResolve(that.value) // 执行then的成功函数，取得返回值
            promiseResolve(promise2, value ,resolve, reject)
            // if(value instanceof Promise) { // 返回值为Promise是，吧当前resolve，reject传递下去，递归去除值
            //   value.then(resolve, reject) 
            // } else { // 若返回值不为Promise，把x传递下去
            //   resolve(value)
            // }
          }catch(e){
            reject(e)
          }
        })
      })

      that.onRejectCallBacks.push(() => {
        setTimeout(() => {
          try {
            let value = onReject(that.reason);
            promiseResolve(promise2, value ,resolve, reject)
            // if(value instanceof Promise) {
            //   value.then(resolve, reject)
            // } else {
            //   resolve(value)
            // }
          } catch(e) {
            reject(e)
          }
        })
      })

    })
  }
  return promise2
}


Promise.prototype.catch = function(onReject) { //catch是捕获promise中的reject值，相当于then中的onRejcted回调函数
  return this.then(null, onReject)
}

Promise.resolve = function(val) {
  if(val instanceof Promise) return val
  return new Promise((resolve, reject) => {
    resolve(val)
  })
}

Promise.reject = function(val) {
  return new Promise((resolve, reject) => {
    reject(val)
  })
}

/**
 * 
 * @param {*} promises.all
 * 接收一个数组为参数
 * 如果参数中如果不是元素不是Promsie类型，则对对其进行Promise.resolve进行处理
 * 当每一个实例都变回resolve，则新的promise为resolve
 * 当有一个为reject，则promise为reject 
 */
Promise.all = function(promises) {
  let res = [] //存放单独成功函数的成功函
  let len = promises.length
  // promises.forEach(item => {
  //   console.log(item)
  // })
  return new Promise((resolve, reject) => {
    promises.forEach( (item, key) => {
      Promise.resolve(item)
        .then(value => {
          res[key] = value;
          console.log(value, ++key === promises.length)
          if(++key === len) {
            resolve(res)
          }
        })
        .catch((e) => {
          reject(e)
        })
    })
  })
}

/**
 * 
 * @param {*} promises.race
 * 参数为数组
 * 新建的promise对象状态与第一个改变状态的promise相同 
 */
Promise.race = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((item, index) => {
      Promise.resolve(item)
        .then((res) => {
          resolve(res)
        })
        .catch((e) => {
          reject(e)
        })
    })
  })
}

Promise.allSettled = function(promises) {
  const arr = []
  const len = promises.length
  return new Promise((resolve, reject) => {
    promises.forEach( (item, index) => { //可以进行优化处理
      Promise.resolve(item)
        .then((res) => {
          arr.push(res)
          if(++index === len) {
            resolve(arr)
          }
        })
        .catch(e => {
          arr.push(e)
          if(++index === len) {
            resolve(arr)
          }
        })
    })
  })
}

/**
 * 
 * @param {*} cb
 * 语法糖，finally的变种，不管成功或者失败还能继续使用then，并且把值原封不动传递下去 
 */
Promise.prototype.finally = function(cb) {
  return this.then(
    value => Promise.resolve(cb()).then(() => value),
    err => Promise.resolve(cb()).then(() => {
      throw err
    }),
  )
}
