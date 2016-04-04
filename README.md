# datareviewer-sampleapps-batchvalidationmanager

## Features

Batch Validation Manager is a web application you can use to schedule the running of Reviewer batch jobs using capabilities provided by ArcGIS 10.3.1 Data Reviewer for Server. The application can be configured to run batch jobs either on a recurring basis—daily, weekly, monthly, or yearly—or once at a future date. A scheduled job identifies the data to be validated, the extent of the validation—the full database or a spatial extent—and whether validation should be run on all features or only changed features for enterprise workspaces. The application uses the Data Reviewer for Server (DRS) batch validation capabilities to schedule and manage batch jobs and stores the results in the Reviewer workspace designated in the DRS Configuration utility.

## Setup
  * Download and unzip the .zip file or clone the repository.
  * Edit the settings.js file and update restReviewerMapServer and drsSoeUrl parameters to point to ArcGIS for Server machine name
  * Web-enable the directory.
  * Access the index.html page.
  
## Requirements
  * ArcGIS DataReviewer for Server 10.3.1 or later.
  * Experience with the ArcGIS API for JavaScript is helpful.

#Resources
- [Deploy data quality services lesson](http://server.arcgis.com/en/data-reviewer/latest/help/lesson-1-deploy-data-quality-services.htm)

#Issues
Found a bug or want to request a new feature? Please let us know by submitting an issue. 

#Contributing
Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).
