{extends "designs/site.tpl"}

{block meta}
    <link rel="alternate" type="application/rss+xml" title="RSS" href="/sections/{$data->Handle}/rss">
{/block}

{block title}{$data->Title|escape} &mdash; {$dwoo.parent}{/block}

{block js-bottom}
    <script type="text/javascript">
        var SiteEnvironment = SiteEnvironment || { };
        SiteEnvironment.courseSection = {JSON::translateObjects($data, false, 'recordURL')|json_encode};
    </script>

    {$dwoo.parent}

    {if !$.get.jsdebug}
        <script src="{Site::getVersionedRootUrl('js/pages/CourseSection.js')}"></script>
    {/if}

    <script>
        Ext.require('Site.page.CourseSection');
    </script>
{/block}


{block "content"}
    {load_templates "subtemplates/blog.tpl"}
    {load_templates "subtemplates/paging.tpl"}

    {$Section = $data}

    <?php
        $this->scope['limit'] = 10;
        $options = [
            'limit' => $this->scope['limit'],
            'offset' => $_GET['offset'] ?: 0,
            'calcFoundRows' => 'yes',
            'conditions' => []
        ];

        $sectionTeacherIds = array_map(function($Teacher) {
            return $Teacher->ID;
        }, $this->scope['Section']->Teachers);

        $latestTeacherPost = \Emergence\CMS\BlogPost::getAllPublishedByContextObject($this->scope['Section'], array_merge_recursive($options, [
            'conditions' => [
                'AuthorID' => [
                    'operator' => 'IN',
                    'values' => $sectionTeacherIds
                ]
            ],
            'limit' => 1
        ]));

        if (count($latestTeacherPost)) {
            $this->scope['latestTeacherPost'] = $latestTeacherPost[0];
            $options['conditions'][] = sprintf('ID != %u', $this->scope['latestTeacherPost']->ID);
        }

        $this->scope['blogPosts'] = \Emergence\CMS\BlogPost::getAllPublishedByContextObject($this->scope['Section'], $options);
        $this->scope['total'] = DB::foundRows();
    ?>

    <div class="sidebar-layout">
        <div class="main-col">
            <div class="col-inner">
                <header class="page-header">
                    <h2 class="header-title">{$Section->Title|escape} <small class="muted">Public Feed</small></h2>
                    <div class="header-buttons"><a href="{$Section->getURL()}/post" class="button primary">Create a Post</a></div>
                </header>

                {if $latestTeacherPost}
                    {blogPost $latestTeacherPost headingLevel="h3" articleClass="well" titlePrefix='<i class="fa fa-thumb-tack"></i>&ensp;'}
                {/if}

                {foreach item=BlogPost from=$blogPosts}
                    {blogPost $BlogPost headingLevel="h3"}
                {foreachelse}
                    <p class="empty-text">This class has no posts in its public feed yet.</p>
                {/foreach}

                <footer class="page-footer">
                    {if $total > $limit}
                        <div class="pagingLinks">
                            <strong>{$total|number_format} post{tif $total != 1 ? s}:</strong> {pagingLinks $total pageSize=$limit}
                        </div>
                    {/if}

                    <a href="/sections/{$Section->Handle}/rss"><img src="{versioned_url img/rss.png}" width=14 height=14 alt="RSS"></a>
                </footer>
            </div>
        </div>

        <div class="sidebar-col">
            <div class="col-inner">

                <section class="well course-section-details">
                    <h3 class="well-title">{$Section->Code|escape}</h3>

                    {if $Section->Course->Description}
                        <div class="muted markdown-ct">{$Section->Course->Description|escape|markdown}</div>
                    {/if}

                    <dl class="kv-list align-right">
                        <div class="dli">
                            <dt>Term</dt>
                            <dd>{$Section->Term->Title}</dd>
                        </div>

                        {if $.User}
                            <div class="dli">
                                <dt>Schedule</dt>
                                <dd>{$Section->Schedule->Title}</dd>
                            </div>
                            <div class="dli">
                                <dt>Location</dt>
                                <dd>{$Section->Location->Title}</dd>
                            </div>
                        {/if}

                        {if $Section->Notes}
                            <div class="dli">
                                <dt>Notes</dt>
                                <dd class="markdown-ct">{$Section->Notes|escape|markdown}</dd>
                            </div>
                        {/if}
                    </dl>
                </section>


                {$launchers = $Section->getLaunchers()}
                {if count($launchers)}
                    <h3>Other Websites</h3>
                    {foreach from=$launchers item=launcher}
                        <a class="button" href="{$launcher.url|escape}" target="_blank">{$launcher.title|escape}</a>
                    {/foreach}
                {/if}


                {if $.User->hasAccountLevel(Staff)}
                    <h3>Course Tools</h3>
                    <ul class="course-section-tools plain">
                        <li class="copy-email"><a class="button" href="#copy-section-emails">Copy Email List</a></li>
                        <li class="download-roster"><a class="button" href="{$Section->getURL()}/students?format=csv&columns=LastName,FirstName,Gender,Username,PrimaryEmail,PrimaryPhone,StudentNumber,Advisor,GraduationYear">Download Roster</a></li>
                    </ul>
                {/if}

                <h3>Teacher{tif count($Section->Teachers) != 1 ? s}</h3>
                <ul class="roster teachers">
                {foreach item=Teacher from=$Section->Teachers}
                    <li>{personLink $Teacher photo=true}</li>
                {foreachelse}
                    <p class="empty-text">No instructors currently listed.</p>
                {/foreach}
                </ul>

                {if $.User}
                    <h3>Students</h3>
                    <ul class="roster students">
                    {foreach item=Student from=$Section->Students}
                        <li>{personLink $Student photo=true}</li>
                    {foreachelse}
                        <p class="empty-text">No students currently listed.</p>
                    {/foreach}
                    </ul>
                {/if}

            </div>
        </div>
    </div>
{/block}