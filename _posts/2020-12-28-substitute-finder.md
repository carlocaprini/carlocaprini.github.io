---
layout: post
title:  "Substitute your Finder 27.21 relay with the Shelly 1 WiFi switch"
categories: [ trick ]
image: assets/images/cables.png
tags: [ featured ]
lang: en
---

The [Shelly 1](https://shelly.cloud/products/shelly-1-smart-home-automation-relay/) is my preferred smart WiFi switch. It is defined by the producers as the _smallest, smartest and most powerful WiFi switch_.

It can be used for:

* controlling an outlet;
* transforming a switch into a smart one;
* behave as a relay.

The relay option may be the most complex one, but it is probably the most useful one when it comes to controlling lights. In fact, differently from the diverter option, with a single relay it is possible to control one or more lights from multiple buttons.

The [wiring documentation](https://shelly.cloud/knowledge-base/devices/shelly-1/#wiring) on the Shelly website is really good. But if you know nothing, or little, about electrical wiring and want to switch your existing Finder 27.21 relay (the same logic applies for the 27.01 one) with the new Shelly 1, here’s what you should be doing.

---

The Finder 27.21 relay is characterised by three inputs: 2, A1 and A2. All three of them will need to be moved to the Shelly 1.

![finder](/assets/images/finder.png)

https://shelly.cloud/knowledge-base/devices/shelly-1/#wiring

![finder](/assets/images/shelly.png)

{% assign asd = "Before starting to move wires around, make sure that electricity is cut out! It is for your own safety in the first place but also for protecting your own home/office electrical system. If you have any doubts or don’t feel comfortable changing the wiring yourself, please consider confronting with your electrician." %}
{% include note.html content=asd %}

Here’s how to more wires from the Finder relay to the Shelly switch.

* Wire from _input 2 of the Finder relay_ should be connected to _Shelly input O_.
* Wire from _input A1 of the Finder relay_ should be connected to both _Shelly input L and I_.
* Wire(s) from _input A2 of the Finder relay_ should be connected to _Shelly input SW_.
* Finally (there are no more wires to move from the Finder relay), _Shelly input N_ should be connected to a clean + pole (it is usually the blue wire taking electricity to your system).

--- 

This is it! It is now possible to power again your system. The Shelly 1 WiFi switch will turn on and it will be ready to be paired with the companion mobile application.

Don’t forget to correctly configure the Shelly 1 settings.

* _Power on default mode_ should be set to Restore Last Mode.
* Button type should be set to Momentary.

It is up to your imagination to decide how to create and combine scenes and automations. Happy hacking! 🤖
