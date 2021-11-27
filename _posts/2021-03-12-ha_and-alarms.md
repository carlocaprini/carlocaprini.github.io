---
layout: post
title:  "Home Assistant and Alarm Systems: why are the two a good match?"
categories: [ smart home, trick ]
image: assets/images/alarm.png
tags: [ home assistant ]
lang: en
---

I never stop looking for new ideas that will allow my home to get smarter and smarter. Lately, I have been stubbornly focusing on making sure my Home Assistant can get full and direct access to my alarm system.

The reasons for this choice were various (the most important is the third one!).

* Why not? 😬
* The more I work to centralising my home intelligence into a single platform, the more I am convinced that it actually makes a lot of sense. It should be possible to control everything from a single system and application without the hassle of having tenths of apps on my smart devices.
* Integrating multiple systems in the same platform allows to create and enable so many additional features and use cases that would not otherwise be possible.

---

So, here’s what I ended up doing.

I successfully integrated my alarm system and Home Assistant. I can now arm and disarm my alarm zones from within Home Assistant – I actually like it even more from the Apple Home app and Siri.

But, more importantly, I can now leverage all the other data available in my smart home platform. This has allowed me to create smart automations that combine together alarm, localisation and lightning features.

Here’s just a few examples and hints. As always, possibilities may be endless.

1. Combine alarm and localisation services
2. Combine alarm sensors and lightning

### 1. Combine alarm and localisation services

What about making sure that, when the last person leaves home, the alarm system automatically arms itself? And, while we are at it, how about making sure that when the first person comes back home the alarm system disarms automatically?

I really like this solution! Until a few months ago, I was rarely arming my alarm. Usually the only occasions for which it made any sense was when we were leaving for at least a few days. Now that I think about it, it is somewhat of a silly habit – especially because 
the one time thieves came to visit, it was lunchtime on a working day. It’s there. I paid for it. It should do its thing.

From now on, my home is always going to be protected – automatically – no matter how much time I spend away. Not bad!

### 2. Combine alarm sensors and lightning

Having access to alarm sensors opens up new possibilities that actually have nothing to do with an alarm system. What about light control?

Alarm sensors can be of various types. Sensors can be mounted on windows and doors and allow to understand when they are open and when they are closed. Sensors can be also be volumetric, thus allowing to understand if a particular space is occupied or not.

I started running some tests with this idea in mind. And it is not a bad idea at all! Various lights in my home can now be switched on and off by automations that take into consideration the alarms sensor values.
Try picturing the following. It is late in the evening (this would not make much sense during the day), dark not only outside but also in your home. You open the entrance door. And the entrance lights turn on. Nice!💡

Similar logics can obviously been applied in other cases – just think about the garage or the terrace lights.

The same could be achieved by taking advantage of movement sensors. But alarm sensors were already there, so…

---

I hope these few tips and tricks can come in handy.

If you were wondering if you can integrate your alarm system into Home Assistant: you now know the answer. Yes, you can!

Also, you know it is possible to achieve something more while leveraging and combining data of different natures.

What I described is obviously one of the many approaches that can be applied. This is especially true because each single home and setup is – as it should be – customised and completely tailored on every particular home. This is the way we like it.