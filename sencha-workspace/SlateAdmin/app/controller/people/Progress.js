/*jslint browser: true, undef: true, white: false, laxbreak: true *//*global Ext,Slate, Jarvus*/
Ext.define('SlateAdmin.controller.people.Progress', {
    extend: 'Ext.app.Controller',
    
    views: [
        'people.details.Progress',
        'people.details.progress.Previewer',
        
        'people.details.progress.note.EditWindow'
    ],
    
    stores: [
        'people.ProgressReports',
        'people.progress.NoteRecipients'
    ],
    
    models: [
        'person.progress.ProgressNote'    
    ],

    refs: [{
        ref: 'progressPanel',
        selector: 'people-details-progress',
        autoCreate: true,

        xtype: 'people-details-progress'
    }, {
        ref: 'progressList'
		,selector: 'people-details-progress dataview'
	}, {
        ref: 'peopleManager',
		selector: 'people-manager'
	}, {
        ref: 'reportSearchField',
		selector: 'people-details-progress #notesSearch'
	}, {
		ref: 'termSelector',
		selector: 'people-details-progress #progressReportsTermSelector'
	},{
        ref: 'reportPreviewer',
		selector: 'people-details-progress-previewer',
        autoCreate: true,
        
		xtype: 'people-details-progress-previewer'
	},{
        ref: 'noteEditorCt',
		selector: 'people-details-progress-note-editwindow #progressNoteCt'
	},{
		ref: 'progressNoteForm',
		selector: 'people-details-progress-note-form'
	},{
		ref: 'progressNoteViewer',
		selector: 'people-details-progress-note-viewer'
	},{
        ref: 'progressNoteRecipientGrid'
		,selector: 'people-details-progress-note-recipientgrid'
	},{
		ref: 'progressNoteEditorWindow',
		selector: 'people-details-progress-note-editwindow',
        autoCreate: true
        
		,xtype: 'people-details-progress-note-editwindow'
	}],

    init: function() {
        // Start listening for events on views
        var me = this;
        
        me.bufferedDoFilter = Ext.Function.createBuffered(me.doFilter, 1000, me);
        me.control({
            'people-manager #detailTabs': {
                beforerender: me.onBeforeTabsRender
            },
            'people-details-progress': {
                personloaded: me.onPersonLoaded
            },
            'people-details-progress #reportTypes menucheckitem': {
                checkchange: me.onProgressTypesChange
			},
			'people-details-progress #progressReportsTermSelector': {
				change: me.onProgressTermChange
			},
            'people-details-progress #progressReportsList': {
                itemclick: me.onProgressRecordClick
			},
            'people-details-progress button[action=export-reports]':{
                click: me.onExportProgressClick
			},
            'people-details-progress button[action=composeNote]':{
                click: me.onComposeProgressNoteClick
			},
            'people-details-progress-note-recipientgrid #customRecipientPersonCombo': {
                select: me.onCustomRecipientPersonSelect
			},
            'people-details-progress-note-recipientgrid button[action=addRecepient]': {
                click: me.onAddProgressNoteRecipient
			},
            'people-details-progress-note-editwindow button[action=discardProgressNote]': {
                click: me.onDiscardProgressNote
			},
			'people-details-progress-note-editwindow button[action=sendProgressNote]': {
				click: me.onSendProgressNote
			}
        });
    },


    // event handlers
    onBeforeTabsRender: function(detailTabs) {
        detailTabs.add(this.getProgressPanel());
    },
    
    onPersonLoaded: function(progressPanel, person) {
        var me = this,
            termSelector = me.getTermSelector(),
			termsStore = Ext.getStore('Terms'),
            progressProxy = Ext.getStore('people.ProgressReports').getProxy(),
            selectedTerm = termSelector.getValue();
            
        // ensure terms are loaded
        if (!termsStore.isLoaded()) {
            progressPanel.setLoading('Loading terms&hellip;');
            termsStore.load({
                callback: function() {
                    me.onPersonLoaded(progressPanel, person);
                }
            });

            return;
        }
        
        if (!selectedTerm) {
            selectedTerm = termsStore.getCurrentTerm();
            if (selectedTerm) {
                selectedTerm = selectedTerm.getId();
            }
        }
        
        progressPanel.setLoading(false);
        
        // push selected term to combo
        termSelector.setValue(selectedTerm);
        
        progressProxy.setExtraParam('StudentID', person.getId());
        progressProxy.setExtraParam('reportTypes[]', [
            'standards',
			'progressnotes',
			'narratives',
			'interims'
		]);
        
        me.bufferedDoFilter(true);
    },
    
    onComposeProgressNoteClick: function() {
        var me = this,
			editor = me.getProgressNoteEditorWindow(),
			noteEditorCt = me.getNoteEditorCt(),
			form = me.getProgressNoteForm(),
			store = Ext.getStore('people.progress.NoteRecipients'),
			person = me.getPeopleManager().getSelectedPerson(),
            personId = person.getId(),
			phantomRecord = new(me.getModel('person.progress.ProgressNote'))({
				ContextClass: 'Emergence\\People\\Person',
				ContextID: personId
			});
		
		noteEditorCt.getLayout().setActiveItem(form);		
		
		editor.updateProgressNote(phantomRecord);
		
		editor.show();
		
		store.load({
			params: {
				personID: personId
			},
			callback: function() {
				
				var noteRecipientID = store.findBy(function(record){
					if(record.get('PersonID') == person.get('AdvisorID') ) {
						return true;
					}
				});
				if(noteRecipientID !== -1) {
				    me.getProgressNoteRecipientGrid().selModel.select(noteRecipientID);
				}
                
			} 
		});
	},
    
    onCustomRecipientPersonSelect: function(combo, records) {
        var emailField = combo.nextSibling('textfield[name="Email"]');

		emailField.setValue(records[0].get('PrimaryEmail').Data);
	},
    
    onAddProgressNoteRecipient: function(btn, t) {
        var menu = btn.up('menu'),
			personField = menu.down('combo[name="Person"]'),
			nameField = menu.down('textfield[name="FullName"]'),
			emailField = menu.down('textfield[name="Email"]'),
			relationshipField = menu.down('textfield[name="Label"]'),
            person = this.getPeopleManager().getSelectedPerson(),
			values = {
				Person: personField.getValue(),
				Label: relationshipField.getValue(),
				Email: emailField.getValue(),
				StudentID: person.getId()
			},
			recipientGrid = this.getProgressNoteRecipientGrid(),
			recipientsStore = Ext.getStore('people.progress.NoteRecipients');
		

		if(personField.isValid() && emailField.isValid()) {
			recipientGrid.setLoading('Attempting to add custom recipient &hellip;');
			
			Ext.Ajax.request({
				url: '/notes/json/addCustomRecipient'
				,params: values
				,success: function(res) {
					var r = Ext.decode(res.responseText);
					
					if(!r.success) {
						Ext.Msg.alert('Failure adding recipient', r.message);
					}
					else {
						var record = recipientsStore.add(r.data);
						
						recipientsStore.sort({
							sorterFn: function(p1, p2){
								if(p1.get('RelationshipGroup') != 'Other' && p2.get('RelationshipGroup') != 'Other')
									return 0;
									
								if(p1.get('RelationshipGroup') != 'Other')
									return 1;
									
								if(p2.get('RelationshipGroup') != 'Other')
									return -1;
									
								return -1;
							}
						});
						
						recipientGrid.getSelectionModel().select(record, true);
						
						menu.hide();
						personField.reset();
						emailField.reset();
						relationshipField.reset();
					}
					recipientGrid.setLoading(false);
				}
				,failure: function() {
					recipientGrid.setLoading(false);
				}
			});
		}
	},
    
    onDiscardProgressNote: function() {
        Ext.Msg.confirm('Discarding Progress Note', 'Are you sure you want to discard this progress note?', function(btn){
			if(btn == 'yes') {
				this.getProgressNoteEditorWindow().close();
			}
		}, this);
	},
	
	onSendProgressNote: function(){
		var me = this
			,editorWindow = me.getProgressNoteEditorWindow()
			,recipients = me.getProgressNoteRecipientGrid().getSelectionModel().getSelection()
			,record = editorWindow.getProgressNote();
			
		if(!recipients.length) {
    		return Ext.Msg.alert('Cannot send email', 'Please select recipients before sending.');
		}
		
		editorWindow.setLoading('Sending&hellip;');
		
		Ext.Msg.confirm('Sending', 'Are you sure you want to send this message?', function(btn){
			if(btn=='no') {
				editorWindow.setLoading(false);
				return false;
			}
			
			
			me.doSaveProgressNote(record, recipients);
		});
	},
    
    onProgressTypesChange: function(checkItem, checked) {
        var menu = checkItem.up('menu'),
			reportTypeCheckboxes = menu.query('menucheckitem[checked=true]'),
			reportsStore = Ext.getStore('people.ProgressReports'),
			reportsProxy = reportsStore.getProxy(),
			reportTypes = [];
		
		for(var key in reportTypeCheckboxes) {
			if(reportTypeCheckboxes[key].checked) {
				reportTypes.push(reportTypeCheckboxes[key].value);
			}
		}
		
		reportsProxy.setExtraParam('reportTypes[]', reportTypes);
		this.bufferedDoFilter();
	},
	
	onProgressTermChange: function(field, newValue, oldValue) {
		var reportsStore = Ext.getStore('people.ProgressReports'),
			reportsProxy = reportsStore.getProxy();
			
		reportsProxy.setExtraParam('termID', newValue);
		
		this.bufferedDoFilter();
	},
    
    onExportProgressClick: function() {
        Ext.Msg.confirm('Exporting Reports', 'Are you sure want to export the currently loaded reports', function(btn) {
			if(btn == 'yes') {
				var me = this,
					reportsList = me.getProgressList(),
					reportsProxy = reportsList.getStore().getProxy(),
					reportsContainer = me.getProgressPanel(),
					exportUrl = '/progress/export?' + Ext.Object.toQueryString(reportsProxy.extraParams),
					exportLoadMask = new Ext.LoadMask(reportsContainer, {
						msg: 'Preparing PDF, please wait, this may take a minute&hellip;'
					});

		        reportsContainer.setLoading(exportLoadMask);
		        
		        Jarvus.util.CookieSniffer.downloadFile(exportUrl, function() {
					reportsContainer.setLoading(false);
		        });
			}
		}, this);
	},
    
    onProgressRecordClick: function(view, record) {
        var me = this;

		switch(record.get('Class'))
		{
			case 'Slate\\Progress\\Note':
				return me.onProgressNoteClick(record);
				
			case 'Slate\\Progress\\Narratives\\Report':
				return me.onNarrativeClick(record);
				
			case 'Slate\\Progress\\Interims\\Report':
				return me.onInterimClick(record);
				
			case 'Standards':
				return me.onStandardsClick(record);
		}
	},
	
	onProgressNoteClick: function(record) {
		var me = this,
			editor = me.getProgressNoteEditorWindow(),
			noteEditorCt = me.getNoteEditorCt(),
			viewer = me.getProgressNoteViewer(),
			progressContainer = me.getProgressPanel();
		
		progressContainer.setLoading({msg: 'Setting up progress note'});
		
		noteEditorCt.getLayout().setActiveItem(viewer);
		Ext.Ajax.request({
			url: '/notes/json/' + record.get('ID'),
			success: function(res) {
				var r = Ext.decode(res.responseText);
				editor.updateProgressNote(r.data);
				progressContainer.setLoading(false);
			}
		});
		
		Ext.getStore('people.progress.NoteRecipients').load({
			params: {
				messageID: record.get('ID')
			},
			callback: function(records, operation){
				var selected = [];
				this.sort({
					sorterFn: function(p1, p2){
						if(p1.get('RelationshipGroup') != 'Other' && p2.get('RelationshipGroup') != 'Other') {
                            return 0;
						}
							
						if(p1.get('RelationshipGroup') != 'Other') {
							return 1;
						}
							
						if(p2.get('RelationshipGroup') != 'Other') {
							return -1;
						}
							
						return -1;
					}
				});
				
				
				for(var key in records) {
					if(records[key].get('selected')) {
						selected.push(records[key]);
					}
				}

				me.getProgressNoteRecipientGrid().getSelectionModel().select(selected);
			}
		});
		editor.show();	
	},
	
	onNarrativeClick: function(record) {
		var reportPreviewer = this.getReportPreviewer();
		
		reportPreviewer.show();
		reportPreviewer.updateReport(record);
	},
	
	onInterimClick: function(record) {
		var reportPreviewer = this.getReportPreviewer();
		
		reportPreviewer.show();
		reportPreviewer.updateReport(record);
	},
	
	onStandardsClick: function(record) {
		
		var reportPreviewer = this.getReportPreviewer();
		
		reportPreviewer.show();
		reportPreviewer.updateReport(record);
	},
    
    doFilter: function(forceReload, callback) {
        var store = Ext.getStore('people.ProgressReports'),
			proxy = store.getProxy();

		if(forceReload || proxy.isExtraParamsDirty()) {
			store.load({
				callback: callback,
				scope: this
			});
		}
	},
    
    doSaveProgressNote: function(record, recipients){
    	var me = this;

		if(record.phantom) {
			record.save({
				success: function(savedRecord) {
				//	console.log(savedRecord);
				
					Ext.getStore('people.ProgressReports').insert(0, {
						ID: savedRecord.get('ID')
						,AuthorUsername: savedRecord.get('Author').Username
						,Date: Ext.Date.format(new Date(savedRecord.get('Created') * 1000),'Y-m-d H:i:s')
						,Subject: savedRecord.get('Subject')
						
					});
					me.doSaveRecipients(record, recipients, true);
				}
				,failure: me.onProgressSaveFailure
				,scope: me
			});
		}
		else {
			me.doSaveRecipients(record, recipients, false);
		}
	},
    
    doSaveRecipients: function(record, recipients, isPhantomNote) {
        var me = this,
			editorWindow = me.getProgressNoteEditorWindow(),
			noteId = '';
			
		if(record.get) {
			noteId = record.get('ID');
		}
		else {
			noteId = record.ID;
		}
		
		Ext.Ajax.request({
			url: '/notes/json/' + noteId + '/recipients',
			method: 'POST',
			jsonData: {
				data: recipients.map(function(r) {
					return  {
						PersonID: r.get('PersonID')
						,Email: r.get('Email')
					};
				})
				,messageID: noteId
			},
			success: function(res){
				var r = Ext.decode(res.responseText);
				
				if(r.success) {	
					editorWindow.setLoading(false);
					editorWindow.hide();
				}
				else {
					me.onProgressSaveFailure();
				}
			},
			failure: me.onProgressSaveFailure
		});
	}
});