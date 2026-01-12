
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginDir = path.join(__dirname, 'node_modules', 'capacitor-plugin-callkit-voip', 'android');

if (!fs.existsSync(pluginDir)) {
    console.error('Plugin directory not found. Please run npm install first.');
    process.exit(1);
}

const gradleFile = path.join(pluginDir, 'build.gradle');
const manifestFile = path.join(pluginDir, 'src', 'main', 'AndroidManifest.xml');
const apiCallsFile = path.join(pluginDir, 'src', 'main', 'java', 'com', 'bfine', 'capactior', 'callkitvoip', 'androidcall', 'ApiCalls.java');

// 1. Fix build.gradle
const newGradle = `
ext {
    junitVersion = '4.13.2'
    androidxAppCompatVersion = '1.6.1'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.0.0'
    }
}

apply plugin: 'com.android.library'

android {
    namespace "com.bfine.capactior.callkitvoip"
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 34
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation project(':capacitor-android')
    implementation "androidx.appcompat:appcompat:1.6.1"
    implementation "com.google.firebase:firebase-messaging:23.4.0"
    implementation project(':capacitor-push-notifications')
}
`;

// 2. Fix AndroidManifest.xml (Change package to match namespace)
if (fs.existsSync(manifestFile)) {
    let manifest = fs.readFileSync(manifestFile, 'utf8');
    manifest = manifest.replace(/package="[^"]*"/, 'package="com.bfine.capactior.callkitvoip"');
    fs.writeFileSync(manifestFile, manifest);
    console.log('Successfully patched AndroidManifest.xml');
}

// 3. Fix ApiCalls.java
const newApiCalls = `
package com.bfine.capactior.callkitvoip.androidcall;

import android.content.Context;
import android.util.Log;

public class ApiCalls {
    public void gettwiliotoken(Context context, String url, final RetreivedTokenCallback callback) {
        Log.d("ApiCalls", "Twilio token fetch skipped - not used in MiniAn");
    }
}
`;

fs.writeFileSync(gradleFile, newGradle);
console.log('Successfully patched build.gradle');

if (fs.existsSync(apiCallsFile)) {
    fs.writeFileSync(apiCallsFile, newApiCalls);
    console.log('Successfully patched ApiCalls.java');
}
