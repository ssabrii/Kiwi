Nitrate.TestRuns = {};
Nitrate.TestRuns.Details = {};
Nitrate.TestRuns.Execute = {}
Nitrate.TestRuns.AssignCase = {}


function toggleDiv(link, divId) {
  var link = jQ(link);
  var div = jQ('#' + divId);
  var show = 'Show All';
  var hide = 'Hide All';
  div.toggle();
  var text = link.html();
  if (text !== show) {
    link.html(show);
  } else {
    link.html(hide);
  }
}


Nitrate.TestRuns.Details.on_load = function() {
  setAddTagAutocomplete();

  // Observe the interface buttons
  jQ('#id_check_all_button').bind('click', function(e) {
    toggleAllCheckBoxes(this, 'id_table_cases', 'case_run');
  });

  if (jQ('#id_check_box_highlight').attr('checked')) {
    jQ('.mine').addClass('highlight');
  }

  jQ('#id_check_box_highlight').bind('click', function(e) {
    e = jQ('.mine');
    this.checked && e.addClass('highlight') || e.removeClass('highlight');
  });

  jQ('#id_blind_all_link').bind('click', function(e) {
    if (!jQ('td[id^="id_loading_"]').length) {
      jQ(this).removeClass('locked');
    }
    if (jQ(this).is('.locked')) {
      //To disable the 'expand all' until all case runs are expanded.
      return false;
    } else {
      jQ(this).addClass('locked');
      var element = jQ(this).children();
      if (element.is('.collapse-all')) {
        this.title = "Collapse all cases";
        blinddownAllCases(element[0]);
      } else {
        this.title = "Expand all cases";
        blindupAllCases(element[0]);
      }
    }
  });

  // Observe the case run toggle and the comment form
  var toggle_case_run = function(e) {
    var c = jQ(this).parent(); // Container
    var c_container = c.next(); // Content Containers
    var case_id = c.find('input[name="case"]')[0].value;
    var case_run_id = c.find('input[name="case_run"]')[0].value;
    var case_text_version = c.find('input[name="case_text_version"]')[0].value;
    var type = 'case_run';
    var callback = function(t) {
      // Observe the update case run stauts/comment form
      c_container.parent().find('.update_form')
        .unbind('submit').bind('submit', updateCaseRunStatus);


      var rc_callback = function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (!window.confirm(default_messages.confirm.remove_comment)) {
          return false;
        }

        const comment_id = $(this).find('input[name=comment_id]').val();
        jsonRPC('TestExecution.remove_comment', [case_run_id, comment_id], function(data) {
            constructCaseRunZone(c_container[0], c[0], case_id);
        });
      };
      c_container.parent().find('.form_comment')
        .unbind('submit').bind('submit', rc_callback);
      c_container.find('.js-status-button').bind('click', function() {
        this.form.value.value = jQ(this).data('formvalue');
      });
      c_container.find('.js-show-comments').bind('click', function() {
        toggleDiv(this, jQ(this).data('param'));
      });
      c_container.find('.js-show-changelog').bind('click', function() {
        toggleDiv(this, jQ(this).data('param'));
      });
      c_container.find('.js-file-caserun-bug').bind('click', function(){
        var params = jQ(this).data('params');
        fileCaseRunBug(params[0], c[0], c_container[0], params[1], params[2]);
      });
      c_container.find('.js-add-testlog').bind('click', function(){
        var params = jQ(this).data('params');
        addLinkToTestExecution(this, params[0], [params[1]]);
      });
      c_container.find('.js-remove-testlog').bind('click', function(){
        var button = this;
        jsonRPC('TestExecution.remove_link', [{pk: $(button).data('param')}], function(result) {
            button.parentNode.parentNode.remove();
        });
      });
    };

    toggleTestExecutionPane({
      'callback': callback,
      'caseId': case_id,
      'caserunId': case_run_id,
      'caseTextVersion': case_text_version,
      'caserunRowContainer': c,
      'expandPaneContainer': c_container
    });
  };
  jQ('.expandable').bind('click', toggle_case_run);

  // Auto show the case run contents.
  if (window.location.hash != '') {
    fireEvent(jQ('a[href=\"' + window.location.hash + '\"]')[0], 'click');
  };

  // Filter Case-Run
  if (jQ('#filter_case_run').length) {
    jQ('#filter_case_run').bind('click',function(e){
      if (jQ('#id_filter').is(':hidden')){
        jQ('#id_filter').show();
        jQ(this).html(default_messages.link.hide_filter);
      } else {
        jQ('#id_filter').hide();
        jQ(this).html(default_messages.link.show_filter);
      }
    });
  }
  //bind click to status btn
  jQ('.btn_status').live('click', function() {
    var from = jQ(this).siblings('.btn_status:disabled')[0].title;
    var to = this.title;
    if (jQ('span#' + to + ' a').text() === '0') {
      var htmlstr = "[<a href='javascript:void(0)' onclick=\"showCaseRunsWithSelectedStatus(jQ('#id_filter')[0], '"
        + jQ(this).attr('crs_id')+"')\">0</a>]";
      jQ('span#' + to).html(htmlstr);
    }
    if (jQ('span#' + from + ' a').text() === '1') {
      jQ('span#' + from).html("[<a>1</a>]");
    }
    jQ('span#' + to + ' a').text(window.parseInt(jQ('span#' + to + ' a').text()) + 1);
    jQ('span#' + from + ' a').text(window.parseInt(jQ('span#' + from + ' a').text()) - 1);

    var caseRunCount = window.parseInt(jQ('span#TOTAL').next().text()) || 0;
    var passedCaseRunCount = window.parseInt(jQ('span#PASSED a').text()) || 0;
    var errorCaseRunCount = window.parseInt(jQ('span#ERROR a').text()) || 0;
    var failedCaseRunCount = window.parseInt(jQ('span#FAILED a').text()) || 0;
    var waivedCaseRunCount = window.parseInt(jQ('span#WAIVED a').text()) || 0;
    var completePercent = 100 * ((passedCaseRunCount + errorCaseRunCount + failedCaseRunCount
      + waivedCaseRunCount) / caseRunCount).toFixed(2);
    var failedPercent = 100 * ((errorCaseRunCount + failedCaseRunCount) / (passedCaseRunCount
      + errorCaseRunCount + failedCaseRunCount + waivedCaseRunCount)).toFixed(2);

    jQ('span#complete_percent').text(completePercent);
    jQ('div.progress-inner').attr('style', 'width:' + completePercent + '%');
    jQ('div.progress-failed').attr('style', 'width:' + failedPercent + '%');
  });

  jQ('#btn_clone').bind('click', function() {
    postToURL(jQ(this).data('param'), serializeCaseRunFromInputList('id_table_cases','case_run'));
  });
  jQ('#btn_delete').bind('click', function() {
    window.location.href = jQ(this).data('param');
  });

  bindJSRemoveTagButton();
  jQ('.js-add-tag').bind('click', function() {
    addRunTag(jQ('.js-tag-ul')[0], jQ(this).data('param'));
  });
  jQ('.js-set-running').bind('click', function() {
    window.location.href = jQ(this).data('param') + '?finished=0';
  });
  jQ('.js-set-finished').bind('click', function() {
    window.location.href = jQ(this).data('param') + '?finished=1';
  });
  jQ('.js-del-case').bind('click', function() {
    delCaseRun(jQ(this).data('param'));
  });
  jQ('.js-update-case').bind('click', function() {
    postToURL(jQ(this).data('param'), serializeCaseRunFromInputList('id_table_cases', 'case_run'));
  });
  jQ('.js-change-assignee').bind('click', function() {
    changeCaseRunAssignee();
  });
  jQ('.js-show-commentdialog').bind('click', function() {
    showCommentForm();
  });

    $('.js-add-links').bind('click', function() {
        bulkAddLinkToTestExecution();
    });

  jQ('.js-add-cc').bind('click', function() {
    addRunCC(jQ(this).data('param'), jQ('.js-cc-ul')[0]);
  });
  jQ('.js-remove-cc').bind('click', function() {
    var params = jQ(this).data('params');
    removeRunCC(params[0], params[1], jQ('.js-cc-ul')[0]);
  });
  jQ('.js-caserun-total').bind('click', function() {
    showCaseRunsWithSelectedStatus(jQ('#id_filter')[0], '');
  });
  jQ('.js-status-subtotal').bind('click', function() {
    showCaseRunsWithSelectedStatus(jQ('#id_filter')[0], jQ(this).data('param'));
  });
};

Nitrate.TestRuns.AssignCase.on_load = function() {
  if (jQ('#id_check_all_button').length) {
    jQ('#id_check_all_button').bind('click', function(m) {
      toggleAllCheckBoxes(this, 'id_table_cases', 'case');
    });
  }

  jQ('input[name="case"]').bind('click', function(t) {
    if (this.checked) {
      jQ(this).closest('tr').addClass('selection_row');
      jQ(this).parent().siblings().eq(7).html('<div class="apply_icon"></div>');
    } else {
      jQ(this).closest('tr').removeClass('selection_row');
      jQ(this).parent().siblings().eq(7).html('');
    }
  });

  jQ('.js-how-assign-case').bind('click', function() {
    jQ('#help_assign').show();
  });
  jQ('.js-close-how-assign').bind('click', function() {
    jQ('#help_assign').hide();
  });
  jQ('.js-toggle-button, .js-case-summary').bind('click', function() {
    toggleTestCaseContents(jQ(this).data('param'));
  });
};


function updateRunStatus(object_pk, value, callback) {
  jQ.ajax({
    'url': '/runs/case-run-update-status/',
    'type': 'POST',
    'data': {'object_pk': object_pk, 'status_id': value },
    'success': function (data, textStatus, jqXHR) {
      callback();
    },
    'error': function (jqXHR, textStatus, errorThrown) {
      json_failure(jqXHR);
    }
  });
}

var updateCaseRunStatus = function(e) {
  e.stopPropagation();
  e.preventDefault();
  var container = jQ(this).parents().eq(3);
  var parent = container.parent();
  var title = parent.prev();
  var link = title.find('.expandable')[0];
  var parameters = Nitrate.Utils.formSerialize(this);
  var object_pk = parameters['object_pk'];
  var value = parameters['value'];

  // Callback when
  var callback = function(t) {
    // Update the contents
    if (parameters['value'] != '') {
      // Update the case run status icon
      var crs = Nitrate.TestRuns.CaseRunStatus;
      title.find('.icon_status').each(function(index) {
        for (i in crs) {
          if (typeof crs[i] === 'string' && jQ(this).is('.btn_' + crs[i])) {
            jQ(this).removeClass('btn_' + crs[i]);
          }
        }
        jQ(this).addClass('btn_' + Nitrate.TestRuns.CaseRunStatus[value - 1]);
      });

      // Update related people
      var usr = Nitrate.User;
      title.find('.link_tested_by').each(function(i) {
        jQ(this).html(usr.username);
      });
    }

    // Mark the case run to mine
    if (!title.is('.mine')) {
      title.addClass('mine');
    }

    // Blind down next case
    fireEvent(link, 'click');
    if (jQ('#id_check_box_auto_blinddown').attr('checked') && parameters['value'] != '') {
      var next_title = parent.next();
      if (!next_title.length) {
        return false;
      }
      if (next_title.next().is(':hidden')) {
        fireEvent(next_title.find('.expandable')[0], 'click');
      }
    } else {
      fireEvent(link, 'click');
    }
  };

  // Add comment
  if (parameters['comment'] != '') {
    // Reset the content to loading
    var ajax_loading = getAjaxLoading();
    ajax_loading.id = 'id_loading_' + parameters['case_id'];
    container.html(ajax_loading);
    var c = jQ('<div>');

    if (parameters['value'] != '') {
        jsonRPC('TestExecution.add_comment', [object_pk, parameters['comment']], function(data){
            updateCommentsCount(parameters['case_id'], true);
        });
    } else {
        jsonRPC('TestExecution.add_comment', [object_pk, parameters['comment']], function(data){
            updateCommentsCount(parameters['case_id'], true);
            callback();
        });

    }
  }

  // Update the object when changing the status
  if (parameters['value'] != '') {
    // Reset the content to loading
    var ajax_loading = getAjaxLoading();
    ajax_loading.id = 'id_loading_' + parameters['case_id'];
    container.html(ajax_loading);
    updateRunStatus([object_pk], value, callback);
  }
};


function constructCaseRunZone(container, title_container, case_id) {
  var link = jQ(title_container).find('.expandable')[0];
  if (container) {
    var td = jQ('<td>', {'id': 'id_loading_' + case_id, 'colspan': 12 });
    td.html(getAjaxLoading());
    jQ(container).html(td);
  }

  if (title_container) {
    fireEvent(link, 'click');
    fireEvent(link, 'click');
  }
}


//////////////////////////////////////////////////////////////////////////////////////////////
////////   AddIssueDialog Definition //////////////


/*
 * Dialog to allow user to add sort of issue keys to case run(s).
 *
 * Here, issue key is a general to whatever the issue tracker system is.
 *
 * options:
 * @param extraFormHiddenData: used for providing extra data for specific AJAX request.
 * @param onSubmit: callback function when user click Add button
 * @param action: string - Add or Remove. Default is Add
 */
/*
 * FIXME: which namespace is proper to hold this dialog class?
 */
function AddIssueDialog(options) {
  this.onSubmit = options.onSubmit;
  if (this.onSubmit !== undefined && typeof this.onSubmit !== "function") {
    throw new Error("onSubmit should be a function object.");
  }
  this.extraFormHiddenData = options.extraFormHiddenData;
  if (this.extraFormHiddenData !== undefined && typeof this.extraFormHiddenData !== "object") {
    throw new Error("extraFormHiddenData sould be an object if present.");
  }

  this.action = options.action;
  if (this.action === undefined) {
    this.action = "Add";
  }

  this.a = options.a;
  if (this.a === undefined) {
    this.a = this.action.toLowerCase();
  }
}


AddIssueDialog.prototype.show = function () {
  var dialog = jQ("#dialog")[0];
  if (dialog == null) {
    throw new Error("No HTML element with ID dialog. This should not happen in the runtime.");
  }

  var hiddenPart = [];
  if (this.extraFormHiddenData !== undefined) {
    for (var name_attr in this.extraFormHiddenData) {
      hiddenPart.push({'name': name_attr, 'value': this.extraFormHiddenData[name_attr]});
    }
  }

  var template = Handlebars.compile(jQ("#add_issue_form_template").html());
  var context = {
    'hiddenFields': hiddenPart,
    'action_button_text': this.action,
    'a': this.a,
  };

  jQ('#dialog').html(template(context))
    .find('.js-cancel-button').bind('click', function() {
      jQ('#dialog').hide();
    })
    .end().show();

  this.form = jQ("#add_issue_form")[0];

  // Used for following event callbacks to ref this dialog's instance
  var that = this;

  // Set custom callback functions
  if (this.onSubmit !== undefined) {
    jQ(this.form).bind('submit', function (form_event) {
      that.onSubmit(form_event, that);
    });
  }
};

AddIssueDialog.prototype.get_data = function () {
  var form_data = Nitrate.Utils.formSerialize(this.form);
  return form_data;
};

//// end of AddIssueDialog definition /////////
/////////////////////////////////////////////////////////////////////////////////////////////

function fileCaseRunBug(run_id, title_container, container, case_id, case_run_id) {
  var dialog = new AddIssueDialog({
    'action': 'Report',
    'onSubmit': function (e, dialog) {
      e.stopPropagation();
      e.preventDefault();

        var tracker_id = dialog.get_data()['bug_system_id'];
        jsonRPC('Bug.report', [case_run_id, tracker_id], function(result) {
            $('#dialog').hide();

            if (result.rc === 0) {
                window.open(result.response, '_blank');
            } else {
                window.alert(result.response);
            }
      });
    }
  });

  dialog.show();
}


function delCaseRun(run_id) {
    if (window.confirm('Are you sure?')) {
        const executions = $('#id_table_cases').find('input[name="case_run"]:checked');

        executions.each(function() {
            var case_id = this.getAttribute('data-case_id');
            jsonRPC('TestRun.remove_case', [run_id, Number(case_id)], function () {
                $(this).closest('tr').remove();
            }.bind(this));
        });
    }
}


// binds the remove buttons for all tags
function bindJSRemoveTagButton() {
  $('.js-remove-tag').bind('click', function() {
    var params = $(this).data('params');
    removeRunTag($('.js-tag-ul')[0], params[0], params[1]);
  });
}


// data is an array of id/name for tags
function updateTagContainer(container, data, run_id) {
    var html = '';

    data.forEach(function(element) {
        var li = '<li>' + element['name'] +
                    '<a href="#" class="js-remove-tag" data-params=\'["'+ run_id + '", "' + element['name'] + '"]\'>' +
                        '&nbsp;<i class="fa fa-trash-o"></i>' +
                    '</a>' +
                 '</li>';
        html += li;
    });

    $(container).html(html);
    bindJSRemoveTagButton();
}


function addRunTag(container, run_id) {
    var tag_container = $('#id_tags');
    var tag = tag_container.val();

    if (!tag) {
        return false;
    }

    var inner_callback = function(data) {
        updateTagContainer(container, data, run_id);
        tag_container.val('');
    }
    jsonRPC('TestRun.add_tag', [run_id, tag], inner_callback);
}

function removeRunTag(container, run_id, tag) {
    var inner_callback = function(data) {
        updateTagContainer(container, data, run_id);
    }
    jsonRPC('TestRun.remove_tag', [run_id, tag], inner_callback);
}

function constructRunCC(container, run_id, parameters) {
  var complete = function(t) {
    jQ('.js-remove-cc').bind('click', function() {
      var params = jQ(this).data('params');
      removeRunCC(params[0], params[1], jQ('.js-cc-ul')[0]);
    });
    if (jQ('#message').length) {
      window.alert(jQ('#message').html());
      return false;
    }
  };
  var url = '/runs/' + run_id + '/cc/';
  jQ.ajax({
    'url': url,
    'type': 'GET',
    'data': parameters,
    'success': function (data, textStatus, jqXHR) {
      jQ(container).html(data);
    },
    'complete': function() {
      complete();
    }
  });
}

function addRunCC(run_id, container) {
  var user = window.prompt('Please type new email or username for CC.');
  if (!user) {
    return false;
  }
  var parameters = {'do': 'add', 'user': user};
  constructRunCC(container, run_id, parameters);
}

function removeRunCC(run_id, user, container) {
  var c = window.confirm('Are you sure to delete this user from CC?');

  if (!c) {
    return false;
  }

  var parameters = { 'do': 'remove', 'user': user };
  constructRunCC(container, run_id, parameters);
}

function changeCaseRunAssignee() {
  var runs = serializeCaseRunFromInputList(jQ('#id_table_cases')[0]);
  if (!runs.length) {
    window.alert(default_messages.alert.no_case_selected);
    return false;
  }

  var p = window.prompt('Please type new email or username for assignee');
  if (!p) {
    return false;
  }

  jQ.ajax({
    'url': '/runs/update-assignee/',
    'type': 'POST',
    'data': { ids: runs, assignee: p },
    'success': function (data, textStatus, jqXHR) {
      window.location.reload();
    },
    'error': function (jqXHR, textStatus, errorThrown) {
      json_failure(jqXHR);
    }
  });
}

function serializeCaseRunFromInputList(table, name) {
  var elements;
  if (typeof table === 'string') {
    elements = jQ('#' + table).parent().find('input[name="case_run"]:checked');
  } else {
    elements = jQ(table).parent().find('input[name="case_run"]:checked');
  }

  var returnobj_list = [];
  elements.each(function(i) {
    if (typeof this.value === 'string') {
      returnobj_list.push(this.value);
    }
  });
  if (name) {
    var returnobj = {};
    returnobj[name] = returnobj_list;
    return returnobj;
  }

  return returnobj_list;
}

function serialzeCaseForm(form, table, serialized) {
  if (typeof serialized !== 'boolean') {
    var serialized = true;
  }
  var data;
  if (serialized) {
    data = Nitrate.Utils.formSerialize(form);
  } else {
    data = jQ(form).serialize();
  }

  data['case_run'] = serializeCaseFromInputList(table);
  return data;
}

function showCaseRunsWithSelectedStatus(form, status_id) {
  form.status__pk.value = status_id;
  fireEvent(jQ(form).find('input[type="submit"]')[0], 'click');
}

function showCommentForm() {
  var dialog = getDialog();
  var runs = serializeCaseRunFromInputList(jQ('#id_table_cases')[0]);
  if (!runs.length) {
    return window.alert(default_messages.alert.no_case_selected);
  }
  var template = Handlebars.compile(jQ("#batch_add_comment_to_caseruns_template").html());
  jQ(dialog).html(template());

  var commentText = jQ('#commentText');
  var commentsErr = jQ('#commentsErr');
  jQ('#btnComment').live('click', function() {
    var comments = jQ.trim(commentText.val());
    if (!comments) {
      commentsErr.html('No comments given');
      return false;
    }

    runs.forEach(function(run_id) {
        jsonRPC('TestExecution.add_comment', [run_id, comments], function(result){}, true);
    });

    reloadWindow();
  });
  jQ('#btnCancelComment').live('click', function(){
    jQ(dialog).hide();
    commentText.val('');
  });
  jQ(dialog).show();
}

jQ(document).ready(function(){
  jQ('.btnBlueCaserun').mouseover(function() {
    jQ(this).find('ul').show();
  }).mouseout(function() {
    jQ(this).find('ul').hide();
  });
  jQ('ul.statusOptions a').click(function() {
    var option = jQ(this).attr('value');
    var object_pks = serializeCaseRunFromInputList(jQ('#id_table_cases')[0]);
    if (option == '') {
      return false;
    }
    if (!object_pks.length) {
      window.alert(default_messages.alert.no_case_selected);
      return false;
    }
    if (!window.confirm(default_messages.confirm.change_case_status)) {
      return false;
    }
    updateRunStatus(object_pks, option, reloadWindow);
  });
});


function bulkAddLinkToTestExecution() {
    var execution_ids = serializeCaseRunFromInputList(jQ('#id_table_cases')[0]);
    if (!execution_ids.length) {
        return window.alert(default_messages.alert.no_case_selected);
    }

    addLinkToTestExecution(null, null, execution_ids);
}

/*
 * - sender: the Add link button, which is pressed to fire this event.
 * - case_id: used for reloading TE details. In case of bulk actions this
 *            is null/undefined and the entire page is reloaded!
 * - execution_ids: Array of TestExecution IDs to which the new link will be added
 */
function addLinkToTestExecution(sender, case_id, execution_ids) {
  var dialog_p = jQ('#addlink_dialog');

  dialog_p.dialog('option', 'target_id', execution_ids);
  dialog_p.dialog('option', 'case_id', case_id);
  if (case_id) {
      // These two options are used for reloading TestExecution when successfully.
      var container = jQ(sender).parents('.case_content.hide')[0];
      dialog_p.dialog('option', 'container', container);
      var title_container = jQ(container).prev()[0];
      dialog_p.dialog('option', 'title_container', title_container);
  }
  dialog_p.dialog('open');
}

/*
 * Initialize dialog for getting information about new link, which is attached
 * to an arbitrary instance of TestExecution
 */
function initialize_addlink_dialog() {
  var dialog_p = jQ('#addlink_dialog');

  dialog_p.dialog({
    autoOpen: false,
    modal: true,
    resizable: false,
    height: 300,
    width: 400,
    open: function() {
      jQ(this).unbind('submit').bind('submit', function (e) {
        e.stopPropagation();
        e.preventDefault();
        jQ(this).dialog('widget').find('span:contains("OK")').click();
      });
    },
    buttons: {
      "OK": function() {
        var name = jQ('#testlog_name').attr('value'),
            url = jQ('#testlog_url').attr('value'),
            is_defect = $('#is_defect').is(':checked'),
            update_tracker = $('#update_tracker').is(':checked'),
            case_id = dialog_p.dialog('option', 'case_id');

        //check if url is valid
        if (url.length === 0 || url.indexOf('://') === -1) {
            return;
        }

        dialog_p.dialog('close');

        jQ(this).dialog('option', 'target_id').forEach(function(target_id) {
            jsonRPC('TestExecution.add_link', [{
                        execution_id: target_id,
                        name: name,
                        url: url,
                        is_defect: is_defect
                    }, update_tracker], function(result) {
                // when bulk adding links case_id will be undefined/null
                if (case_id) {
                    if (is_defect) {
                        $('span#' + target_id + '_case_bug_count').addClass('have_bug');
                    }

                    // Begin to construct case run area
                    var container = dialog_p.dialog('option', 'container');
                    var title_container = dialog_p.dialog('option', 'title_container');
                    constructCaseRunZone(container, title_container, case_id);
                }
            });
        });

        // reload entire page if adding in bulk
        if (!case_id) {
            window.location.reload(true);
        }
      },
      "Cancel": function() {
        jQ(this).dialog('close');
      }
    },
    beforeClose: function() {
      // clean name and url for next input
      jQ('#testlog_name').val('');
      jQ('#testlog_url').val('');

      return true;
    },
    /* ATTENTION: target_id can be determined when open this dialog, and
     * this must be set
     */
    target_id: null
  });
}


/*
 * Toggle TestExecution panel to edit a case run in run page.
 *
 * Arguments:
 * options.casrunContainer:
 * options.expandPaneContainer:
 * options.caseId:
 * options.caserunId:
 * options.caseTextVersion:
 * options.callback:
 */
function toggleTestExecutionPane(options) {
  var container = options.caserunRowContainer;
  var content_container = options.expandPaneContainer;
  var callback = options.callback;

  content_container.toggle();

  if (content_container.find('.ajax_loading').length) {
    var url = '/case/' + options.caseId + '/execution-detail-pane/';
    var data = { case_run_id: options.caserunId, case_text_version: options.caseTextVersion };

    jQ.get(url, data, function(data, textStatus) {
      content_container.html(data);
      callback();
    }, 'html');
  }

  toggleExpandArrow({ caseRowContainer: container, expandPaneContainer: content_container });
}
