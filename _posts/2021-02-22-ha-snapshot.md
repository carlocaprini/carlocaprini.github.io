---
layout: post
title:  "Yes, also Home Assistant needs a Snapshot every now and then: is this enough?"
categories: [ smart home, trick ]
image: assets/images/snapshot-wardrobe.png
tags: [ home assistant]
lang: en
---

I have been working with Home Assistant for one year now. And I am one of those guys that like trying things out. I like to — who would not agree? 😬 — make sure that things are working fine. But I also like ensuring they are configured the way I like. So I can modify, update and configure again and again everything in the easiest possible way.

I really like this approach. But, there is a but! I like it until I have to do everything from scratch again — and again, who would not agree? 🤞

Snapshots are what should prevent anyone from loosing their complete Home Assistant configuration. For me they proved so very useful! They allowed me to run tests and break things while knowing that I had a backup plan allowing me to roll back to a working configuration.

So I tried. And I broke things. And I rolled back. And then I made some breakthroughs. And I created a snapshot. And so on and so forth.
This approach worked like a charm until a few days ago. The Raspberry Pi where my Home Assistant was running just died. The SD card corrupted. No way to recover my precious snapshots. 😫

My only consolation is the fact that the majority of my Home Assistant configuration is tracked in GitHub. And while I am writing this, I am also thinking “I had such a great idea when I started tracking things with git!”.

![tweet](/assets/images/raspberry-died-tweet.png)

The first blog post I wrote about smart home automation really helped me out in the recovery phase. The process for settings up again an empty environment were fast and easy to apply. But there were (and still are) a few things it will take some time to re-arrange. The characteristic positivity is telling me this way I will be able to do things better, at least.

Here’s what I lost. And what you may also lost if you don’t take some precautions.

* Any add-on configurations — my pick goes for File Editor, Terminal and SSH and the KNXD Daemon (plus a new one I will shortly tell you about).
* All SSL certificate setup allowing remote and secure access to the Home Assistant instance.
* People setup, together with any device association that could provide location based services.
* HomeKit integration 😅
* All the Lovelace setup, that had been created directly from the UI.

---

So there are two things of key importance!

### 1. Creating a new snapshot every now and then

I would say, at least each time something gets changed in the Home Assistant configuration.

* Browse in the Supervisor section of your Home Assistant panel
* In the Snapshots tab click Create (you can optionally specify a name for your snapshot).
* In a few minutes you will see a new snapshot appearing in the Snapshot list.

### 2. Configure the Snapshot backup in Google Drive

There is a great add-on that can be configured in a matter of minutes. It allows to configure and automatically manage the synchronisation of the [Snapshots within Google Drive](https://github.com/sabeechen/hassio-google-drive-backup).

It may save a great deal of headache in the unlucky event something bad happens to your smart home server.

---

For sure I am going to sleep tighter knowing that I have a safer backup strategy then before.

And my home just got a little bit more smarter.
