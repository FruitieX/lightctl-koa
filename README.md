# lightctl-koa

A rewrite of lightctl using Koa and TypeScript.

lightctl aims to provide a sane, unified API for various smart lighting systems.

### Supported protocols / API:s

- Philips Hue
  - Lightbulbs
  - Dimmer switches
  - Misc ZigBee peripherals such as power switches
- Razer Chroma (WIP)
- lightctl UDP protocol for custom lighting hardware (e.g. Arduino, ESP32...)
  - Able to drive e.g. hundreds of WS2812b LEDs at 60 FPS

Plus it's easy to add support for more API:s

### TODO

- Philips Hue
  - Entertainment API for faster control over Hue bulbs?
