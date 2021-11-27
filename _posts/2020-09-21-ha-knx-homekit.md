---
layout: post
title:  "A smart home with HomeAssistant, KNX and Apple HomeKit"
categories: [ smart home, trick ]
image: assets/images/1.jpeg
tags: [ featured, sticky, knx, homekit, home assistant ]
lang: en
---

Recently I have been doing some renovations at my place and I had the chance to setup some basic domotic features. In particular, I asked my electrician to wire all my blinds with KNX while thinking “I will configure and setup the rest myself, I can do it!”.

I wanted to control my home (not only blinds!) with the Apple Home app — in general, the idea of automations is great — while being able to make direct requests to Siri.

Did I manage it? Yes!

Was it worth it? Definitely yes — even if I am not really sure about the KNX choice and sometimes I wonder if it would have been possible doing it in another way!

---

Here’s the steps required for reproducing my configuration.
1. Install Home Assistant on a Raspberry Pi 3.
2. Connect the Raspberry to the KNX interface.
3. Configure your KNX devices in Home Assistant.
4. Configure Home Assistant as a bridge accessory in Apple Home.

### Install HomeAssistant on a Raspberry Pi 3

Home Assistant is an open-source home automation platform. The official website offers details about all the steps needed to successfully [install Home Assistant](https://www.home-assistant.io/getting-started/). Here’s what I did for my Raspberry Pi 3.

1. Download the recommended image.
2. Flash the SD card (I used balenaEtcher as suggested).
3. Insert the card in the Pi and turn it on: it will download the latest version of Home Assistant.
4. Once the download process is completed, Home Assistant will be available at [http://homeassistant.local:8123](http://homeassistant.local:8123).

Once the installation is complete:
1. Create a user for Home Assistant.
2. Configure your home (pick location, time zone, elevation and your preferred unit of measurement).

### Connect the Raspberry to the KNX interface

There are mainly two families of KNX interfaces you can take advantage of: the IP and the USB ones. I went for the USB one mainly because I found a great offer, but this choice required some additional struggling on the configuration side – nothing to worry about.

If you also decide to go for the USB option, you should definitely check out [this](https://github.com/da-anda/hass-io-addons) add-on that allows to convert your USB interface into an IP one.

Any doubts should be easily solved by going through [this discussion](https://community.home-assistant.io/t/knxd-add-on-covert-your-knx-usb-interface-into-an-ip-interface-that-can-be-used-by-ha/38108) in the Home Assistant community.

Once your setup is complete, you should be able to configure and start using all your KNX enabled devices.

Also – and this was an unexpected and pleasant discovery for me – you will now be able to access and configure your KNX infrastructure wirelessly.

### Configure the KNX devices in Home Assistant

In order to setup the KNX entries it is necessary to edit the configuration.yml file. This can be done by either using [File Editor](https://github.com/home-assistant/hassio-addons/tree/master/configurator) (it’s one of the official add-ons offered by Home Assistant) or by directly connecting via SSH with the [Terminal and SSH](https://github.com/home-assistant/hassio-addons/tree/master/ssh) add-on.

First, enable KNX by adding the following to the file config/configuration.yml. No need to define any additional configuration if you are using the USB interface.

```yaml
knx:
```

You can now define all your devices in the dedicated section. Here’s an example for a KNX cover.

```yaml
cover:
  – platform: knx
    name: "Kitchen cover"
    move_long_address: "1/0/0"
    move_short_address: "1/1/0"
    travelling_time_down: 38
    travelling_time_up: 38
    position_state_address: "2/2/17"
```

Once you have configured all your devices, it is time to restart your Home Assistant: all your devices should become available. Time to start making your home smart with scenes and automations.

### Configure Home Assistant as bridge accessory in Apple Home

You should by now be able to control your home via Home Assistant, but why not doing it directly via Apple Home Kit?

Again, you need to update your _config/configuration.yml_ file by adding the following and restarting.

```yaml
homekit:
```

Check out your Home Assistant notification section. You should have a new message with the Home Kit code and QR code. Tip: save them somewhere safe because once used you will have no way of recovering them.

Fire up your Home app on your preferred Apple device and add a new accessory. Either scan your QR code or input the Home Assistant code. You will receive a warning because you are trying to add a non-certified accessory: keep going!

And tada! 🚀

You can access and control all your KNX devices via your Home app, configure automations and and use Siri to to run scenes. It is up to 
your imagination now.

---

Personally, after having played and tested for a while, I now prefer to keep all my automations in Home Assistant while running dedicated scenes directly from Apple Home. I think the choice here really depends on your particular configuration and setup.