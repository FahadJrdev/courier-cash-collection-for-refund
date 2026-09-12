(function () {
  'use strict';

  var D = window.CASE_DATA;
  var app = document.getElementById('app');

  function money(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function day(ts) {
    if (!ts) { return '—'; }
    var m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) { return String(ts); }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ', ' + m[4] + ':' + m[5];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* "2026-09-11" -> "11 September", so the window is written from the data and never retyped. */
  function windowLabel(date, short) {
    var m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) { return String(date || ''); }
    var full = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
    var abbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(m[3]) + ' ' + (short ? abbr : full)[Number(m[2]) - 1];
  }

  function sortedCouriers() {
    return Object.keys(D.couriers)
      .map(function (k) { return D.couriers[k]; })
      .sort(function (a, b) { return b.still_with_courier - a.still_with_courier; });
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    var list = sortedCouriers();
    var max = list.length ? list[0].still_with_courier : 1;

    var rows = list.map(function (c, i) {
      var meta = c.chains.length + (c.chains.length === 1 ? ' order' : ' orders');
      if (c.in_till > 0.005) { meta += ' · ' + money(c.in_till) + ' of it already in our till'; }
      if (c.still_with_courier < 0.005) { meta += ' · nothing owed'; }
      return '<button class="row" data-id="' + c.id + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        '<span class="who"><span class="nm">' + esc(c.name) + '</span>' +
        '<span class="meta">' + meta + '</span></span>' +
        '<span class="amt' + (c.still_with_courier < 0.005 ? ' is-clear' : '') + '">' + money(c.still_with_courier) + '</span>' +
        '<span class="bar"><span style="width:' + Math.max(2, (c.still_with_courier / max) * 100) + '%"></span></span>' +
        '<span class="chev" aria-hidden="true">›</span>' +
        '</button>';
    }).join('');

    app.innerHTML =
      '<div class="stack">' +
        '<div class="stack-sm">' +
          '<h1>LakLak paid these refunds — then our report stopped asking the couriers for the cash.</h1>' +
          '<p class="lede">Between ' + windowLabel(D.window[0]) + ' and ' + windowLabel(D.window[1]) + ', ' + D.refunded_count + ' delivered cash orders were refunded to the customer out of LakLak\'s own money' +
          (D.cancelled_count ? ', and ' + D.cancelled_count + ' more was cancelled after delivery' : '') + '. ' +
          'The courier had already taken that cash at the door — but the cash desk stopped asking him for it, because our report only counted orders still marked <em>delivered</em>.</p>' +
        '</div>' +

        '<div class="figures">' +
          '<div class="figure is-owed"><span class="v">' + money(D.total_still_with) + '</span><span class="k">TJS still with couriers</span></div>' +
          '<div class="figure is-good"><span class="v">' + money(D.total_in_till) + '</span><span class="k">TJS the cashier collected anyway — in our till, unrecorded</span></div>' +
          '<div class="figure"><span class="v">' + money(D.total_never_asked) + '</span><span class="k">TJS erased from the report in total</span></div>' +
          '<div class="figure"><span class="v">' + D.courier_count + '</span><span class="k">couriers, ' + D.total_orders + ' orders, ' + D.window_days + ' days</span></div>' +
        '</div>' +

        '<div class="note is-good">' +
          '<h3>The cash desk was already fighting this by hand</h3>' +
          '<p>Of ' + D.notes_receipts + ' receipts, <strong>' + D.notes_total + '</strong> carry a handwritten note. In ' + D.record_fix_receipts + ' of them the cashier had spotted that the report showed less than the courier app, ' +
          'took the <strong>higher</strong> amount, and wrote the real figure in the note — because the form would not let him type it. ' +
          'That is why <strong>' + money(D.total_in_till) + ' TJS is in our till and not in a pocket.</strong></p>' +
          '<p>Not one note mentions a refund. They knew the two screens disagreed; they did not know why. That is why they caught the big gaps and missed the small ones.</p>' +
        '</div>' +

        (D.to_collect && D.to_collect.length ?
        '<div class="note collect">' +
          '<h3>What to ask each courier for, now the fix is live</h3>' +
          '<p>The left column is what the courier report puts on screen. The middle one is money already in our till ' +
          'against a receipt that recorded less than the cashier took — it is <strong>not</strong> collectable twice. ' +
          'The right-hand column is the figure to collect.</p>' +
          '<p class="hint">These are the ' + D.courier_count + ' couriers this bug touched. Other couriers carry ordinary ' +
          'balances of their own that were never affected, so they are not listed here.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th class="r">Report shows</th><th class="r">Already in our till</th><th class="r">Ask him for</th>' +
          '</tr></thead><tbody>' +
          D.to_collect.map(function (c) {
            return '<tr' + (c.should_show < 0.005 ? ' class="settled"' : '') + '><td>' + esc(c.name) + '</td>' +
              '<td class="r">' + money(c.will_show) + '</td>' +
              '<td class="r' + (c.in_till > 0.005 ? ' gap' : '') + '">' + (c.in_till > 0.005 ? money(c.in_till) : '—') + '</td>' +
              '<td class="r collect-amt">' + money(c.should_show) + '</td></tr>';
          }).join('') +
          '</tbody><tfoot><tr>' +
            '<td>Total</td>' +
            '<td class="r">' + money(D.total_will_show) + '</td>' +
            '<td class="r gap">' + money(D.total_in_till) + '</td>' +
            '<td class="r collect-amt">' + money(D.total_to_collect) + '</td>' +
          '</tr></tfoot></table></div>' +
          '<p class="bridge"><strong>How this fits with the figures at the top.</strong> Those describe the money the ' +
          'refunds erased. This table is everything the couriers owe today, which is more than that. Of the ' +
          '<strong>' + money(D.total_to_collect) + '</strong> to collect, <strong>' + money(D.total_still_with) + '</strong> ' +
          'is the erased refund cash still out there, and <strong>' + money(D.total_ordinary_balance) + '</strong> is ' +
          'ordinary balance — cash taken in the last day or two and not yet handed in, which this bug never touched. ' +
          'The ' + money(D.total_in_till) + ' appears in both places because it is the same money: it lowers the refund ' +
          'residue and it lowers what is left to collect. It is not counted twice.</p>' +
          (D.to_collect.filter(function (c) { return c.should_show + 0.005 < c.still_with; }).map(function (c) {
            return '<p class="bridge">' + esc(c.name) + ' is the one row where the two do not line up: ' +
              money(c.should_show) + ' to collect against ' + money(c.still_with) + ' of refund cash. ' +
              'The difference was already recovered by correcting his receipt by hand, so it is settled and must not be asked for again.</p>';
          }).join('')) +
        '</div>' : '') +

        '<div class="explain">' +
          '<h2>What happened, in five plain steps</h2>' +
          '<div class="flow">' +
            '<div class="flow-step ok"><b>step 1</b>Customer pays the courier cash at the door.</div>' +
            '<div class="flow-step ok"><b>step 2</b>Courier hands that cash to the cash desk. Correct so far.</div>' +
            '<div class="flow-step ok"><b>step 3</b>Later the customer asks for a refund and we pay them back from our own till.</div>' +
            '<div class="flow-step bad"><b>step 4</b>Our report drops that order, so the money vanishes from what the courier owes.</div>' +
            '<div class="flow-step bad"><b>step 5</b>Next morning the desk asks him for less than he is holding. He pays what we asked and keeps the rest.</div>' +
          '</div>' +
          '<p><strong>Nobody stole anything.</strong> Every courier paid exactly the number our screen showed him. The number was wrong. ' +
          'It happens <strong>once per refund</strong> — not every day — which is why the amounts below match the refunded orders exactly.</p>' +
        '</div>' +

        '<div class="stack-sm">' +
          '<h2>Where the money is</h2>' +
          '<p class="hint">Amounts shown are what is still with each courier. Tap a name for his own dates, his receipts, and the notes the cashier wrote at the desk.</p>' +
          '<div class="list">' + rows +
            '<div class="list-foot"><span></span><span>Still to collect</span><span class="amt">' + money(D.total_still_with) + '</span><span></span><span></span></div>' +
          '</div>' +
        '</div>' +

        '<div class="note is-warn">' +
          '<h3>Before you collect from anyone: ' + D.record_fix_couriers.length + ' of these figures are still wrong in our own system</h3>' +
          '<p>The cashier could not type the amounts he actually took, so <strong>our records understate what these ' + D.record_fix_couriers.length + ' paid us.</strong> ' +
          'Once the fix is deployed the courier report will ask them for money they have already handed over — a total of <strong>' +
          money(D.total_record_fix) + ' TJS</strong> — until ' + D.record_fix_receipts + ' receipts are corrected.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th class="r">Report will show</th><th class="r">Should be</th><th class="r">Do not collect</th><th>Receipts to correct</th>' +
          '</tr></thead><tbody>' +
          D.record_fix_couriers.map(function (r) {
            return '<tr class="flag"><td>' + esc(r.name) + '</td>' +
              '<td class="r">' + money(r.will_show) + '</td>' +
              '<td class="r">' + money(r.should_show) + '</td>' +
              '<td class="r gap">' + money(r.diff) + '</td>' +
              '<td class="num">' + r.receipts.join(', ') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p>The other ' + (D.courier_count - D.record_fix_couriers.length) + ' couriers in the list above are unaffected — their receipts match the cash, so their figures are correct the moment the fix goes live.</p>' +
        '</div>' +

        (D.live_incidents && D.live_incidents.length ?
        '<div class="note is-warn">' +
          '<h3>On 10 September it happened twice at the desk, while we watched</h3>' +
          '<p>The cash desk reported both the same day. Each traces to a single order whose cash had already been handed in before the sale was undone.</p>' +
          '<div class="scroll"><table><thead><tr>' +
            '<th>Courier</th><th>Receipt</th><th class="r">Desk asked</th><th class="r">He was holding</th><th class="r">Left behind</th><th>The order behind it</th>' +
          '</tr></thead><tbody>' +
          D.live_incidents.map(function (i) {
            return '<tr class="flag"><td>' + esc(i.courier) + '</td>' +
              '<td class="num">' + esc(i.receipt) + '</td>' +
              '<td class="r">' + money(i.asked) + '</td>' +
              '<td class="r">' + money(i.holding) + '</td>' +
              '<td class="r gap">' + money(i.short_by) + '</td>' +
              '<td class="num">' + esc(i.order_code) + ' · ' + money(i.order_amount) + ' · ' +
              esc(i.reversed_to) + ' ' + day(i.reversed_at) + ', after ' + esc(i.settled_receipt) + '</td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<p><strong>' + esc(D.live_incidents[0].courier) + '</strong> was asked for ' + money(D.live_incidents[0].asked) +
          ' when he was holding ' + money(D.live_incidents[0].holding) + ', so ' + money(D.live_incidents[0].short_by) +
          ' stayed in his pocket. His phantom order was <em>cancelled</em> and never carried a delivery row at all, ' +
          'so the code fix cannot recover it from the history — that one needs a correction written by hand.</p>' +
          '<p><strong>' + esc(D.live_incidents[1].courier) + '</strong> is worse in kind, if smaller. His balance read ' +
          money(D.live_incidents[1].asked) + ' — money we appeared to owe <em>him</em> — so the desk form flipped itself ' +
          'into payout mode and recorded the ' + money(D.live_incidents[1].holding) + ' he handed over as a payment <em>to</em> him. ' +
          'The balance moved the wrong way and the receipt never reached Collected Histories. ' +
          'Without the phantom credit his balance that morning was ' + money(D.live_incidents[1].holding) +
          ' and the receipt would have closed him to zero.</p>' +
        '</div>' : '') +

        '<div class="note good">' +
          '<h3>This is already fixed in the code</h3>' +
          '<p>The report no longer asks "is this order still marked delivered?". It now asks "did the courier deliver it and take the cash?" — read from the order\'s own delivery history, which a refund cannot erase. A refund is now what it always was: <strong>our cost, not a discount on what the courier owes.</strong></p>' +
          (D.corrections_applied ?
          '<p>Three records could not be fixed by code, because code cannot read what was never written down, so they were corrected by hand and are already in the database: ' +
          'P-001 is now the acceptance it always was, and R-242 and R-249 carry the amounts the cashier actually settled — 964.25 and 133.50 — ' +
          'instead of the smaller figures the form allowed. The 115.00 order behind R-242 never got a delivery row at all, so the history had nothing for the fix to find.</p>'
          :
          '<p>Three records still need correcting by hand, because code cannot read what was never written down. ' +
          'P-001 has to become the acceptance it always was; R-242 and R-249 have to carry the amounts the cashier settled — ' +
          '964.25 and 133.50 — instead of the smaller figures the form allowed. ' +
          'The 115.00 order behind R-242 never got a delivery row at all, so the history has nothing for the fix to find.</p>') +
        '</div>' +
      '</div>';

    Array.prototype.forEach.call(app.querySelectorAll('.row'), function (b) {
      b.addEventListener('click', function () { location.hash = '#/courier/' + b.getAttribute('data-id'); });
    });
  }

  /* ---------------- courier detail ---------------- */

  function chainBlock(ch) {
    var steps = '';

    steps += '<li class="settled"><span class="t"><span class="w">The courier delivered order ' + esc(ch.code) +
      ' and took <strong>' + money(ch.amount) + ' TJS</strong> cash from the customer.</span>' +
      '<span class="d">' + day(ch.delivered_at) + ' &nbsp;·&nbsp; order ' + esc(ch.order) + '</span></span></li>';

    if (ch.settled_receipt) {
      steps += '<li class="settled"><span class="t"><span class="w">He handed that cash in at the cash desk. <span class="tag good">correct</span></span>' +
        '<span class="d">' + day(ch.settled_at) + ' &nbsp;·&nbsp; receipt ' + esc(ch.settled_receipt) + '</span></span></li>';
    } else {
      steps += '<li class="wait"><span class="t"><span class="w">He had not yet reached the cash desk with it.</span>' +
        '<span class="d">no receipt after this delivery</span></span></li>';
    }

    steps += '<li><span class="t"><span class="w">We refunded the customer <strong>' + money(ch.amount) + ' TJS</strong> from LakLak\'s own money.' +
      (ch.reversed_to === 'cancelled' ? ' (order cancelled)' : '') + '</span>' +
      '<span class="d">' + day(ch.reversed_at) + '</span></span></li>';

    steps += '<li class="hit"><span class="t"><span class="w">At that moment our report removed the order — so the ' + money(ch.amount) +
      ' TJS disappeared from what the courier owed us.</span><span class="d">same moment, automatic</span></span></li>';

    if (ch.caught) {
      steps += '<li class="settled"><span class="t"><span class="w">The cashier spotted it. The report showed less than the courier app, so he took the <strong>higher</strong> amount — ' +
        (ch.note_base ? '<strong>' + money(ch.note_base) + ' TJS</strong>' : 'the app figure') +
        ' — and wrote it in the note, because the form would not let him type it. ' +
        '<span class="tag good">collected — in our till</span></span>' +
        '<span class="d">receipt ' + esc(ch.note_receipt || '') + '</span></span></li>';
      if (ch.note) {
        steps += '<li class="quote"><span class="t"><span class="w"><span class="orig">«' + esc(ch.note) + '»</span>' +
          (ch.note_en ? '<span class="tr">' + esc(ch.note_en) + '</span>' : '') +
          '</span><span class="d">the cashier’s own words on that receipt</span></span></li>';
      }
      steps += '<li class="settled"><span class="t"><span class="w">So this ' + money(ch.amount) +
        ' TJS is <strong>not</strong> with the courier. It is in LakLak’s till — just recorded as a smaller number.</span>' +
        '<span class="d">nothing to collect from him for this order</span></span></li>';
    } else if (ch.next_receipt) {
      var others = ch.other_orders_gap || 0;
      var breakdown = others > 0.005
        ? money(ch.next_gap) + ' not asked for that morning — this order\'s ' + money(ch.amount) +
          ' plus ' + money(others) + ' still left over from his earlier refunds'
        : money(ch.amount) + ' not asked for';
      steps += '<li class="hit"><span class="t"><span class="w">Next visit to the cash desk we asked him for <strong>' + money(ch.next_asked) +
        ' TJS</strong>, but he was holding <strong>' + money(ch.next_held) + ' TJS</strong> — this order\'s ' + money(ch.amount) +
        ' among it. He paid what we asked and went home with the difference. <span class="tag owed">not asked</span></span>' +
        '<span class="d">' + day(ch.next_at) + ' &nbsp;·&nbsp; receipt ' + esc(ch.next_receipt) +
        ' &nbsp;·&nbsp; ' + breakdown + '</span></span></li>';
    } else {
      steps += '<li class="wait"><span class="t"><span class="w">He has not been to the cash desk since the refund, so this ' + money(ch.amount) +
        ' TJS has <strong>not been asked for yet</strong>. It will go missing at his next visit unless we collect it. <span class="tag wait">still catchable</span></span>' +
        '<span class="d">no receipt yet after ' + day(ch.reversed_at) + '</span></span></li>';
    }

    return '<div class="chain">' +
      '<div class="chain-head"><span class="ttl">Order ' + esc(ch.code) + '</span><span class="sp"></span>' +
      '<span class="amt">' + money(ch.amount) + ' TJS</span></div>' +
      '<ol class="steps">' + steps + '</ol></div>';
  }

  function renderCourier(id) {
    var c = D.couriers[String(id)];
    if (!c) { location.hash = ''; return; }

    var pending = c.chains.filter(function (x) { return !x.next_receipt; })
      .reduce(function (s, x) { return s + x.amount; }, 0);
    var slipped = c.never_asked - pending;

    var chains = c.chains.slice().sort(function (a, b) { return b.amount - a.amount; }).map(chainBlock).join('');

    var flagged = c.receipts.filter(function (r) { return Math.abs(r.gap) > 0.005; });
    var shown = flagged.length ? flagged : c.receipts.slice(-6);
    var receiptRows = shown.map(function (r) {
      var bad = Math.abs(r.gap) > 0.005;
      return '<tr' + (bad ? ' class="flag"' : '') + '>' +
        '<td class="num">' + esc(r.receipt) + '</td>' +
        '<td class="num">' + day(r.at) + '</td>' +
        '<td class="r">' + money(r.asked) + '</td>' +
        '<td class="r">' + money(r.held) + '</td>' +
        '<td class="r gap">' + (bad ? money(r.gap) : '—') + '</td>' +
        '</tr>';
    }).join('');

    app.innerHTML =
      '<div class="stack">' +
        '<button class="back">‹ All couriers</button>' +

        '<div class="stack-sm">' +
          '<h1>' + esc(c.name) + '</h1>' +
          '<p class="lede">' + (c.phone ? esc(c.phone) + ' · ' : '') + 'courier ID ' + c.id + ' · ' +
          c.deliveries.toLocaleString('en-US') + ' cash deliveries and ' + c.receipts_count + ' cash desk visits in this period.</p>' +
        '</div>' +

        '<div class="headline' + (c.still_with_courier < 0.005 ? ' is-clear' : '') + '">' +
          '<span class="big">' + money(c.still_with_courier) + ' TJS</span>' +
          '<p class="lede">' +
          (c.still_with_courier < 0.005
            ? 'He owes <strong>nothing</strong>. The report erased ' + money(c.never_asked) +
              ' from his collection, but the cashier noticed and collected it anyway — it is in our till, recorded as a smaller number.'
            : 'is still with him, out of ' + money(c.never_asked) + ' the report erased across ' + c.chains.length +
              (c.chains.length === 1 ? ' order' : ' orders') + '.' +
              (c.in_till > 0.005
                ? ' The cashier caught <strong>' + money(c.in_till) + '</strong> of it at the desk — that part is already in our till.'
                : ' None of it was caught at the desk.') +
              (pending > 0.005
                ? ' <strong>' + money(pending) + '</strong> has not been asked for yet and is still catchable.'
                : '')) +
          '</p>' +
        '</div>' +

        '<div class="figures">' +
          '<div class="figure"><span class="v">' + money(c.collected) + '</span><span class="k">TJS he collected from customers</span></div>' +
          '<div class="figure"><span class="v">' + money(c.accepted) + '</span><span class="k">TJS he handed to the cash desk</span></div>' +
          '<div class="figure"><span class="v">' + money(c.owed_system) + '</span><span class="k">TJS our old report said he owes</span></div>' +
          '<div class="figure is-owed"><span class="v">' + money(c.cash_in_hand) + '</span><span class="k">TJS of our cash actually in his hands</span></div>' +
          '<div class="figure is-good"><span class="v">' + money(c.in_till) + '</span><span class="k">TJS of it the cashier already collected</span></div>' +
        '</div>' +

        '<div class="explain">' +
          '<h2>The simple arithmetic</h2>' +
          '<p>Our records say he took <strong>' + money(c.collected) + '</strong> from customers and handed in <strong>' +
          money(c.accepted) + '</strong> — a difference of ' + money(c.owed_correct) + '. ' +
          'Our old report said only <strong>' + money(c.owed_system) + '</strong>, because it had quietly deleted ' +
          money(c.never_asked) + ' worth of refunded orders from his collection.</p>' +
          (c.in_till > 0.005
            ? '<p>But the records understate what he handed in. On the receipts below the cashier physically took <strong>' +
              money(c.in_till) + '</strong> more than he was able to type, and wrote the real figure in the note. ' +
              'Counting that, what is genuinely still with him is <strong>' + money(c.still_with_courier) + '</strong>' +
              (c.still_with_courier < 0.005 ? ' — nothing.' : '.') + '</p>'
            : '') +
          (Math.abs(c.fee) > 0.005 || Math.abs(c.paid_out) > 0.005
            ? '<p class="hint">Separately from the cash: ' +
              (Math.abs(c.fee) > 0.005 ? 'we owe him <strong>' + money(c.fee) + '</strong> in earned delivery fees' : '') +
              (Math.abs(c.fee) > 0.005 && Math.abs(c.paid_out) > 0.005 ? ', and ' : '') +
              (Math.abs(c.paid_out) > 0.005 ? '<strong>' + money(c.paid_out) + '</strong> is recorded as already paid out to him' : '') +
              '. The courier report nets that off his balance, which is why it lands on ' + money(c.report_should_show) +
              ' rather than ' + money(c.cash_in_hand) + '. The cash figures above are unaffected.</p>'
            : '') +
          '<p class="hint">Every number on this page comes from his own deliveries and his own signed receipts. Nothing is estimated.</p>' +
        '</div>' +

        (c.payout_note
          ? '<div class="note"><h3>One more thing on this courier: receipt P-001</h3><p>' + esc(c.payout_note) + '</p></div>'
          : '') +

        (c.record_fix.length
          ? '<div class="note is-warn">' +
              '<h3>Our own record still understates what he paid — do not collect ' + money(c.in_till) + '</h3>' +
              '<p>On these receipts the cashier physically took the higher amount but the form would not let him type it, so <code>accepted_amount</code> is short. ' +
              'Once the fix is deployed the courier report will show <strong>' + money(c.report_will_show) +
              '</strong> for him when the true figure is <strong>' + money(c.report_should_show) +
              '</strong>. Correct these ' + c.record_fix.length +
              (c.record_fix.length === 1 ? ' receipt' : ' receipts') + ' first:</p>' +
              '<div class="scroll"><table><thead><tr>' +
                '<th>Receipt</th><th>Date</th><th class="r">Recorded</th><th class="r">Should be</th><th class="r">Short by</th>' +
              '</tr></thead><tbody>' +
              c.record_fix.map(function (f) {
                return '<tr class="flag"><td class="num">' + esc(f.receipt) + '</td>' +
                  '<td class="num">' + esc(f.date) + '</td>' +
                  '<td class="r">' + money(f.recorded) + '</td>' +
                  '<td class="r">' + money(f.should_be) + '</td>' +
                  '<td class="r gap">' + money(f.difference) + '</td></tr>';
              }).join('') +
              '</tbody></table></div>' +
              '<p class="hint">Each figure comes from the cashier&rsquo;s own note on that receipt, quoted in full further down.</p>' +
            '</div>'
          : '') +

        (slipped > 0.005 || flagged.length
          ? '<div class="stack-sm">' +
              '<h2>Proof from his own receipts</h2>' +
              '<p class="hint">"We asked" is the figure our system printed that morning. "He was holding" is what his own deliveries and payments say he actually had. Our system wrote both figures itself — they are not our opinion.</p>' +
              (c.in_till > 0.005
                ? '<p class="hint">The last column is the gap <em>in the record</em>. Where the cashier left a note he took that cash anyway and could not type it, so the record kept showing a gap the till does not have. The orders below say which.</p>'
                : '') +
              '<div class="scroll"><table><thead><tr>' +
              '<th>Receipt</th><th>When</th><th class="r">We asked</th><th class="r">He was holding</th><th class="r">Gap in the record</th>' +
              '</tr></thead><tbody>' + receiptRows + '</tbody></table></div>' +
            '</div>'
          : '') +

        (c.notes_count
          ? '<div class="stack-sm">' +
              '<h2>Every note the cashier wrote on his receipts</h2>' +
              '<p class="hint">' + c.notes_count + ' of his ' + c.receipts_count + ' receipts carry a handwritten note. ' +
              'Most are the routine per-order fee arithmetic. ' +
              (c.notes_revealing
                ? '<strong>' + c.notes_revealing +
                  (c.notes_revealing === 1 ? ' note shows' : ' notes show') +
                  ' the cashier taking more than the form let him record</strong> — highlighted below.'
                : 'None of them shows the cashier taking more than he recorded.') +
              '</p>' +
              '<div class="scroll"><table><thead><tr>' +
                '<th>Receipt</th><th>Date</th><th class="r">Recorded</th><th>What the cashier wrote</th>' +
              '</tr></thead><tbody>' +
              c.notes.map(function (n) {
                return '<tr' + (n.reveals_more ? ' class="flag"' : '') + '>' +
                  '<td class="num">' + esc(n.receipt) + '</td>' +
                  '<td class="num">' + esc(n.date) + '</td>' +
                  '<td class="r">' + money(n.recorded) +
                    (n.reveals_more ? '<br><span class="gap">→ ' + money(n.should_be) + '</span>' : '') + '</td>' +
                  '<td class="note-cell">' + esc(n.text) +
                    (n.reveals_more
                      ? '<span class="tag owed">took ' + money(n.short_by) + ' more than recorded</span>'
                      : '') + '</td>' +
                  '</tr>';
              }).join('') +
              '</tbody></table></div>' +
            '</div>'
          : '') +

        '<div class="stack-sm">' +
          '<h2>Order by order, step by step</h2>' +
          '<p class="hint">Each block is one order that was refunded or cancelled after he had delivered it, with the exact dates it moved through.</p>' +
          chains +
        '</div>' +

        '<div class="note">' +
          '<h3>What we will say to him</h3>' +
          (c.still_with_courier < 0.005
            ? '<p>"You delivered these orders and collected the cash correctly, and you handed all of it in. Our system had wrongly reduced the figure it asked you for, but the cashier noticed and took the right amount — so <strong>you owe us nothing.</strong> Our own record still shows a smaller number and we are correcting that on our side. Nothing is being asked of you."</p>'
            : '<p>"You delivered these orders and collected the cash correctly, and you paid exactly what we asked for every time. The mistake is ours: after the customer was refunded, our system reduced the figure it showed you. But that money is LakLak\'s — not the customer\'s and not yours — because we already paid the customer back ourselves. ' +
              (c.in_till > 0.005 ? 'Part of it the cashier already collected from you, and that part is settled. ' : '') +
              'We have fixed the system so this cannot happen again, and here are the dates and receipts so you can check every figure yourself."</p>') +
        '</div>' +

        '<div class="note good">' +
          '<h3>Why it cannot happen again</h3>' +
          '<p>The report used to ask <em>"is this order still marked delivered?"</em>. A refund changed that answer, so the money disappeared. It now asks <em>"did the courier deliver it and take the cash?"</em> — read from the order\'s delivery history, which a refund cannot rewrite. From now on a refund only costs LakLak, and never changes what a courier owes.</p>' +
        '</div>' +
      '</div>';

    app.querySelector('.back').addEventListener('click', function () { location.hash = ''; });
    window.scrollTo(0, 0);
  }

  /* ---------------- router ---------------- */

  function setWindowLabel() {
    var el = document.getElementById('window-label');
    if (el && D.window) {
      el.textContent = windowLabel(D.window[0], true) + ' – ' + windowLabel(D.window[1], true) +
        ' ' + String(D.window[1]).slice(0, 4);
    }
  }

  function route() {
    var m = location.hash.match(/^#\/courier\/(\d+)$/);
    if (m) { renderCourier(m[1]); } else { renderHome(); }
  }

  window.addEventListener('hashchange', route);
  setWindowLabel();
  route();
})();
