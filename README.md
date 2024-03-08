[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/peternguyew)

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6e6495428bbd41f0807e4239c42403eb)](https://www.codacy.com/manual/PeterNgTr/codeceptjs-rphelper?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=PeterNgTr/codeceptjs-rphelper&amp;utm_campaign=Badge_Grade)
[![GitHub tag](https://img.shields.io/github/tag/kobenguyent/codeceptjs-rphelper?include_prereleases=&sort=semver&color=blue)](https://github.com/kobenguyent/codeceptjs-rphelper/releases/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)

# codeceptjs-rphelper

Streamline your CodeceptJS test results with seamless integration into ReportPortal.

`codeceptjs-rphelper` is a CodeceptJS helper designed to publish test results on [ReportPortal](https://reportportal.io/) effortlessly after execution.

## Installation

```sh
npm i codeceptjs-rphelper --save
```

## Configuration

To utilize this plugin, add the following configuration to your `codecept.conf.(js|ts)` file:

```javascript
{
  ...
   plugins: {
    reportportal: {
      require: 'codeceptjs-rphelper',
      token: 'YOUR_TOKEN',
      endpoint: 'http://localhost:8080/api/v1',
      launchName: 'This is awesome',
      launchDescription: 'This is a description of your launch',
      launchAttributes: [{ key: 'yourKey', value: 'yourValue' }],
      projectName: 'YOUR_PROJECT',
      rerun: false,
      debug: false,
      enabled: true
    }
  ...
}
```

Specify the following information:

- `token`: Found on the user profile page, use it for authentication instead of a password.
- `endpoint`: Your ReportPortal host + `/api/v1`, e.g., `http://localhost:8080/api/v1`.
- `launchName`: The desired launch name (default is the suite title).
- `launchDescription`: Description of your launch (default is empty).
- `launchAttributes`: Attributes for your launch (default is empty).
- `projectName`: The project created in the ReportPortal UI.
- `debug`: Enable debug mode for ReportPortal.
- `rerun`: Enable rerun.
- `rerunOf`: UUID of the launch to rerun. If not specified, the latest launch with the same name will be updated.
- `issue`: Test item issue object. Visit [client-javascript](https://github.com/reportportal/client-javascript?tab=readme-ov-file#finishtestitem) for more info.

For additional logs, set `debug: true` in the configuration.

## Video

[View Example Video](https://github.com/kobenguyent/codeceptjs-rphelper/assets/7845001/f2a84ed1-acae-46f7-a611-90345e0a43c9)

---

Feel free to further modify this template based on your preferences and additional information you'd like to provide.