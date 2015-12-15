console.log('Hello world')

function sayHello() {
  if (Math.random() < 0.5) {
    console.log('Hello')
  } else {
    console.log('World')
  }
}

setInterval(sayHello, 2000)
