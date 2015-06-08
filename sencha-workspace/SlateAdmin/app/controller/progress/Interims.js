/*jslint browser: true, undef: true, white: false, laxbreak: true *//*global Ext,Slate*/
Ext.define('SlateAdmin.controller.progress.Interims', {
    extend: 'Ext.app.Controller',

    views: [
        'progress.interims.Manager',
        'progress.interims.Printer',
        'progress.interims.email.Manager'
    ],
    stores: [
        'progress.Interims',
        'progress.interims.Emails',
        'progress.interims.People',
        'Terms'
    ],
    models: [
        'course.Section'
    ],
    refs: [{
        ref: 'interimsEmailManager',
        autoCreate: true,
        selector: 'progress-interims-email-manager',
        
        xtype: 'progress-interims-email-manager'
    }, {
        ref: 'interimsEmailSearchForm',
        selector: 'progress-interims-email-manager form'
    }, {
        ref: 'interimsEmailGrid',
        selector: 'progress-interims-email-grid'
    }, {
        ref: 'interimsManager',
        autoCreate: true,
        selector: 'progress-interims-manager',
        
        xtype: 'progress-interims-manager'
    }, {
        ref: 'interimsGrid',
        selector: 'progress-interims-grid'
    }, {
        ref: 'interimReport',
        selector: 'progress-interims-report'
    }, {
        ref: 'interimDeleteBtn',
        selector: 'progress-interims-report button[action=delete]'
    }, {
        ref: 'interimCancelBtn',
        selector: 'progress-interims-report button[action=cancel]'
    }, {
        ref: 'interimSaveDraftBtn',
        selector: 'progress-interims-report button[action=save][status=Draft]'
    }, {
        ref: 'interimPublishBtn',
        selector: 'progress-interims-report button[action=save][status=Published]'
    }, {
        ref: 'interimsPrinter',
        autoCreate: true,
        selector: 'progress-interims-printer',
        
        xtype: 'progress-interims-printer'
    }, {
        ref: 'interimsPrintForm',
        selector: 'progress-interims-printer form'
    }, {
        ref: 'interimsTermSelector',
        selector: 'progress-interims-grid #termSelector'
    }],
    routes: {
        'progress/interims': 'showInterims',
        'progress/interims/email': 'showInterimEmails',
        'progress/interims/printing': 'showInterimPrinting'
    },
    init: function () {
        var me = this;

        me.control({
            'progress-interims-manager': {
                activate: me.onInterimsActivate
            },
            'progress-interims-grid': {
                beforeselect: me.onBeforeInterimReportSelect,
                select: me.onInterimReportSelect,
                deselect: me.onInterimReportDeselect
            },
            'progress-interims-report button[action=delete]': {
                click: me.onInterimDeleteClick
            },
            'progress-interims-report button[action=cancel]': {
                click: me.onInterimCancelClick
            },
            'progress-interims-report button[action=save]': {
                click: me.onInterimSaveClick
            },
            'progress-interims-printer button[action=preview]': {
                click: me.onInterimsPreviewClick
            },
            'progress-interims-printer button[action=print]': {
                click: me.onInterimsPrintClick
            },
            'progress-interims-printer button[action=save-csv]': {
                click: me.onInterimsSaveCsvClick
            },
            'progress-interims-printer button[action=clear-filters]': {
                click: me.onInterimsClearFiltersClick
            },
            'progress-interims-email-manager button[action=interim-email-search]': {
                click: me.onInterimEmailSearchClick
            },
            'progress-interims-email-manager button[action=clear-filters]': {
                click: me.onInterimEmailClearFiltersClick
            },
            'progress-interims-email-grid': {
                select: me.onStudentInterimEmailSelect
            },
            'progress-interims-email-grid button[action=interim-email-send]': {
                click: me.onInterimEmailSendClick
            },
            'progress-interims-grid #termSelector': {
                change: me.onTermChange
            },
            'progress-interims-report': {
                dirtychange: me.onInterimEditorDirtyChange
            }
        });
    },


    //route handlers
    showInterims: function () {
        this.application.loadCard(this.getInterimsManager());
    },

    showInterimEmails: function () {
        this.application.loadCard(this.getInterimsEmailManager());
    },

    showInterimPrinting: function () {
        var advisorsStore = Ext.getStore('people.Advisors');

        if (!advisorsStore.isLoaded()) {
            advisorsStore.load();
        }
        this.application.loadCard(this.getInterimsPrinter());
    },


    //event handlers
    onInterimsActivate: function () {
        this.loadMyStudents();
    },

    onTermChange: function (field, newValue, oldValue) {
        Ext.getStore('progress.Interims').load({
            params: {
                termID: newValue
            }
        });
    },

    onBeforeInterimReportSelect: function (rowModel, record) {
        var me = this,
            editor = me.getInterimReport(),
            manager = me.getInterimsManager(),
            interim = manager.getInterim(),
            interimSaved = manager.getInterimSaved(),
            isDirty = editor.isDirty();

        if (!interimSaved && interim && isDirty) {
            Ext.Msg.confirm('Unsaved Changes', 'You have unsaved changes to this report.<br/><br/>Do you want to continue without saving them?', function (btn) {
                if (btn == 'yes') {
                    manager.updateInterim(record);
                    manager.setInterimSaved(true);

                    rowModel.select([record]);
                }
            });

            return false;
        }
    },

    onInterimReportSelect: function (rowModel, record, index) {
        this.getInterimsManager().updateInterim(record);
    },

    onInterimReportDeselect: function (rowModel, record, index) {
        this.getInterimsManager().unloadInterim(record);
    },

    onInterimCancelClick: function (btn, ev) {
        Ext.Msg.confirm('Cancelin Changes', 'Are you sure you want to cancel your changes', function (btn) {
            if (btn == 'yes') {
                this.getInterimsManager().unloadInterim();
            }
        }, this);
    },
    
    onInterimEditorDirtyChange: function () {
        this.getInterimsManager().setInterimSaved(false);
    },

    onInterimSaveClick: function (btn, ev) {
        var me = this,
            report = me.getInterimReport(),
            grade = report.down('#courseGrade').getValue(),
            reportData = report.getValues(false, true),
            manager = me.getInterimsManager(),
            interim = manager.getInterim();

        report.setLoading('Saving&hellip;');

        reportData.Status = btn.status;
        reportData.Grade = reportData.Grade ? reportData.Grade : grade;

        if (reportData.Status == 'Published' && !reportData.Grade) {
            Ext.Msg.alert('Report Incomplete', 'You must select a grade before publishing a report.');
            report.setLoading(false);
            return false;
        }

        if (reportData.Comments == '<br>')
            reportData.Comments = null;

        interim.set(reportData);

        interim.save({
            success: function (record, operation) {
                var r = Ext.decode(operation.response.responseText),
                    savedInterim = r.data[0];

                me.getInterimsManager().setInterimSaved(true);

                interim.set('Saved', savedInterim.Saved);
                //Same issue in narratives doSaveReport
                /*
if(!interim.get('ID')) {
                    interim.setId(savedInterim.ID);
                }
*/

                interim.commit();
                report.setLoading(false);

                if (!me.getInterimsGrid().getSelectionModel().selectNext()) {
                    me.getInterimsManager().unloadInterim();
                }
            },
            failure: function () {
                report.setLoading(false);
            }
        });
    },

    onInterimDeleteClick: function () {
        var me = this,
            manager = me.getInterimsManager(),
            interim = manager.getInterim(),
            grid = me.getInterimsGrid(),
            interimStore = grid.getStore();

        if (interim.get('Status') == 'Phantom') {
            return true;
        }

        Ext.Msg.confirm('Delete report?', 'Are you sure you want to delete this interim report?', function (btn) {
            if (btn != 'yes') {
                return;
            }
            me.getInterimReport().setLoading({msg: 'Deleting&hellip;'});

            interim.destroy({
                success: function (record, operation) {
                    manager.unloadInterim();

                    var phantomRecord = interimStore.add({
                        Class: interim.get('Class'),
                        Section: interim.get('Section'),
                        Student: interim.get('Student'),
                        Term: interim.get('Term'),
                        TermID: interim.get('TermID'),
                        StudentID: interim.get('StudentID'),
                        CourseSectionID: interim.get('CourseSectionID'),
                        Status: 'Phantom'
                    });

                    interimStore.sort({
                        fn: function (r1, r2) {
                            var student1 = r1.get('Student'),
                                student2 = r2.get('Student');
                                
                                if (student1.LastName < student2.LastName) {
                                    return -1;
                                } else {
                                    return 1;
                                }
                        }
                    });

                    grid.getSelectionModel().select(phantomRecord);

                    me.getInterimReport().setLoading(false);
                },
                failure: function () {
                    me.getInterimReport().setLoading(false);
                }
            });
        });
    },

    onInterimsPreviewClick: function () {
        var formValues = this.getInterimsPrintForm().getForm().getValues();
        this.getInterimsPrinter().loadPreview(formValues);
    },

    onInterimsPrintClick: function () {
        var formValues = this.getInterimsPrintForm().getForm().getValues();
        this.getInterimsPrinter().loadPrint(formValues);
    },

    onInterimEmailSearchClick: function () {
        var formValues = this.getInterimsEmailSearchForm().getForm().getValues(),
            recipients = formValues.Recipients,
            emailStore = Ext.getStore('progress.interims.Emails'),
            emailProxy = emailStore.getProxy();

        formValues.Recipients = Array.isArray(recipients) ? recipients.join(',') :  [recipients].join(',');

        formValues = Ext.apply({
            Recipients: null,
            termID: null,
            advisorID: null,
            authorID: null,
            studentID: null
        }, formValues);

        for (var key in formValues) {
            emailProxy.setExtraParam(key, formValues[key]);
        }

        emailStore.load({
            scope: this,
            callback: function (records) {
                this.getInterimsEmailGrid().down('#interimEmailTotalText').setText(records.length + ' Report' + (records.length == 1 ? '' : 's'));
            }
        });
    },

    onStudentInterimEmailSelect: function (grid, record) {
        var emailManager = this.getInterimsEmailManager(),
            formValues = this.getInterimsEmailSearchForm().getForm().getValues(),
            recipients = formValues.Recipients,
            key;

        formValues.Recipients = Array.isArray(recipients) ? recipients.join(',') :  [recipients].join(',');
        

        formValues = Ext.apply(formValues,{
            studentID: record.get('Student').ID
        });

        emailManager.loadStudentPreview(formValues);
    },
    
    onInterimEmailSendClick: function () {
        var emailStore = Ext.getStore('progress.interims.Emails'),
            formValues = this.getInterimsEmailSearchForm().getForm().getValues(),
            recipients = formValues.Recipients;

        if (!emailStore.getCount()) {
            return Ext.Msg.alert('User Error', 'Must load interims before sending');
        }

        formValues.Recipients = Array.isArray(recipients) ? recipients.join(',') :  [recipients].join(',');

        formValues = Ext.apply({
            sendEmails: true
        }, formValues);

        Ext.Msg.confirm('Sending Interim Emails', 'Are you sure you want to send these interims?', function (btn) {
            if (btn == 'yes') {
                Ext.Ajax.request({
                    url: '/interims/email',
                    params: formValues
                });
            }
        });
    },

    onInterimsSaveCsvClick: function () {
        var formValues = this.getInterimsPrintForm().getForm().getValues();
        this.getInterimsPrinter().downloadCsv(formValues);
    },

    onInterimsClearFiltersClick: function () {
        this.getInterimsPrintForm().getForm().reset();
    },
    
    onInterimEmailClearFiltersClick: function () {
        this.getInterimsEmailSearchForm().getForm().reset();
    },
    
    loadMyStudents: function () {
        Ext.getStore('progress.Interims').load({
            url: '/interims/json/mystudents',
            params: {
                termID: this.getInterimsTermSelector().getValue()
            }
        });
    }
});