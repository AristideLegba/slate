/*jslint browser: true, undef: true, white: false, laxbreak: true *//*global Ext,Slate*/
Ext.define('SlateAdmin.controller.progress.Worksheets', {
    extend: 'Ext.app.Controller',
    
    views: [
        'progress.standards.worksheets.Manager'
    ],
    stores: [
        'progress.standards.Worksheets',
        'progress.standards.Prompts'
    ],
    refs: [{
        ref: 'worksheetGrid',
        selector: 'progress-standards-worksheets-grid'
    }, {
        ref: 'worksheetEditor',
        selector: 'progress-standards-worksheets-editor'
    }, {
        ref: 'promptsGrid',
        selector: 'progress-standards-worksheets-promptsgrid'
    }, {
        ref: 'worksheetsManager',
        autoCreate: true,
        selector: 'progress-standards-worksheets-manager',
        xtype: 'progress-standards-worksheets-manager'
    }],
    routes: {
        'progress/standards/worksheets': 'showStandardsWorksheets'
    },
    init: function () {
        var me = this;
        
        me.control({
            'progress-standards-worksheets-manager': {
                activate: me.onWorksheetsActivate
            },
            'progress-standards-worksheets-grid': {
                itemclick: me.onWorksheetClick,
                edit: me.onStandardsWorksheetEdit
            },
            'progress-standards-worksheets-grid button[action=createWorksheet]': {
                click: me.onAddWorksheetClick   
            },
            'progress-standards-worksheets-promptsgrid button[action=addPrompt]': {
                click: me.onAddPromptClick
            },
            'progress-standards-worksheets-promptsgrid button[action=disableWorksheet]': {
                click: me.onDisableWorksheetClick
            },
            'progress-standards-worksheets-promptsgrid': {
                itemdeleteclick: me.onPromptDeleteClick,
                edit: me.onWorksheetPromptEdit
            },
            'progress-standards-worksheets-editor textareafield': {
                change: {
                    fn: me.onDescriptionChange,
                    buffer: 2000
                },
                keypress: me.onDirtyDescription
            }
        });
        
        me.application.on('login', me.syncWorksheets, me);
        me.application.on('login', me.syncPrompts, me);
    },
    
    
    //route handlers
    showStandardsWorksheets: function () {
        this.application.loadCard(this.getWorksheetsManager());
    },
    
    
    //event handlers
    onPromptDeleteClick: function (index) {
        var record = Ext.getStore('progress.standards.Prompts').getAt(index),
            worksheet = this.getWorksheetsManager().getWorksheet(),
            editor = this.getWorksheetEditor();

        Ext.MessageBox.confirm('Deleting Prompt', 'Are you absolutely sure you want to delete this prompt. You won\'t be able to see it again.', function (value) {
            if (value == 'yes') {
                editor.setLoading('Deleting&hellip;');
                record.destroy({
                    callback: function() {
                        editor.setLoading(false);
                    }
                });
            }
        }, this);
    },
    
    onDirtyDescription: function (field) {
        field.addClass('dirty').removeCls('saved');
    },
    
    onWorksheetsActivate: function () {
        Ext.getStore('progress.standards.Worksheets').load();
    },
    
    onAddWorksheetClick: function () {
        var store = Ext.getStore('progress.standards.Worksheets'),
            worksheetGrid = this.getWorksheetGrid(),
            phantomWorksheet = store.insert(0, [{
                Title: '',
                Status: 'Live'
            }])[0];

        worksheetGrid.getPlugin('worksheetEditing').startEdit(phantomWorksheet, 0);
    },

    onWorksheetClick: function (grid, record) {
        var editor = this.getWorksheetEditor(),
            store = Ext.getStore('progress.standards.Prompts'),
            proxy = store.getProxy(),
            worksheetId = record.get('ID');
        
        this.getWorksheetsManager().updateWorksheet(record);
        editor.enable();

        if (worksheetId) {
            proxy.setExtraParam('WorksheetID', worksheetId);        
            store.load();
        }
    },
    
    onStandardsWorksheetEdit: function (editor, e) {
        var record = e.record,
            grid = this.getWorksheetGrid();
        
        if (record.dirty) {
            grid.setLoading('Saving&hellip;');
            
            record.save({
                success: function (record) {
                    grid.setLoading(false);
                },
                failure: function () {
                    grid.setLoading(false);
                }
            });
        }
    },
    
    onDescriptionChange: function (field) {
        var worksheetEditor = this.getWorksheetEditor(),
            form = worksheetEditor.getForm();
        
        if (worksheetEditor) {
            form.updateRecord();
            
            form.getRecord().save({
                success: function () {
                    field.removeCls('dirty').addCls('saved');
                }
            });
        }
    },
    
    onAddPromptClick: function () {
        var store = Ext.getStore('progress.standards.Prompts'),
            manager = this.getWorksheetsManager(),
            grid = this.getPromptsGrid(),
            phantomPrompt = store.add({
                WorksheetID: manager.getWorksheet().get('ID')
            })[0];
            
            grid.getPlugin('promptEditing').startEdit(phantomPrompt, 0);
    },
    
    onWorksheetPromptEdit: function (editor, e) {
        var record = e.record,
            grid = this.getPromptsGrid();
        
        if (record.dirty) {
            grid.setLoading('Saving&hellip;');
            
            record.save({
                success: function (record) {
                    grid.setLoading(false);
                },
                failure: function () {
                    grid.setLoading(false);
                }
            });
        }
    },

    onDisableWorksheetClick: function () {
        Ext.MessageBox.confirm('Disabling Worksheet', 'Are you absolutely sure you want to disable this worksheet. You won\'t be able to see it again.', function (value) {
            var editor = this.getWorksheetEditor(),
                record = this.getWorksheetsManager().getWorksheet();
            
            if (value == 'yes') {
                record.set('Status', 'Hidden');

                Ext.getStore('progress.standards.Worksheets').load();
                
                editor.disable();
            }
        }, this);
    },
    
    //helper functions
    syncWorksheets: function () {
        var grid = this.getWorksheetGrid(),
            store = Ext.getStore('progress.standards.Worksheets');
        
        if (grid) {
            grid.setLoading('Syncing&hellip;');
        
            store.sync({
                success: function () {
                    grid.setLoading(false);
                },
                failure: function () {
                    grid.setLoading(false);
                }
            });
        }
    },
    
    syncPrompts: function () {
        var grid = this.getPromptsGrid(),
            manager = this.getWorksheetsManager(),
            worksheet = manager ? manager.getWorksheet() : false,
            store = Ext.getStore('progress.standards.Prompts');
        
        if (grid && worksheet) {

            store.getProxy().setExtraParam('WorksheetID', worksheet.get('ID'));
            store.sync();
        }
    }
});