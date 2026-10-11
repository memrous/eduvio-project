<?php

namespace Tests\Unit;

use App\Services\Department\PersonNames;
use PHPUnit\Framework\TestCase;

class PersonNamesTest extends TestCase
{
    public function test_split_keeps_titles_after_name_with_the_person(): void
    {
        $this->assertSame(
            ['Mgr. Jan Novák', 'RNDr. Petr Dvořák, Ph.D.'],
            PersonNames::split('Mgr. Jan Novák, RNDr. Petr Dvořák, Ph.D.'),
        );
    }

    public function test_split_handles_several_titles_after_name(): void
    {
        $this->assertSame(
            ['prof. RNDr. Radim Bělohlávek, Ph.D., DSc.', 'doc. RNDr. Miroslav Kolařík, Ph.D.'],
            PersonNames::split('prof. RNDr. Radim Bělohlávek, Ph.D., DSc., doc. RNDr. Miroslav Kolařík, Ph.D.'),
        );
        $this->assertSame(
            ['prof. Mgr. Radomír Halaš, Dr.', 'Ing. Mia Radová', 'MDDr. Karel Panchártek'],
            PersonNames::split('prof. Mgr. Radomír Halaš, Dr., Ing. Mia Radová, MDDr. Karel Panchártek'),
        );
    }

    public function test_split_of_empty_value(): void
    {
        $this->assertSame([], PersonNames::split(null));
        $this->assertSame([], PersonNames::split(' , '));
    }

    public function test_normalize_removes_titles_diacritics_case_and_spaces(): void
    {
        $this->assertSame('jan outrata', PersonNames::normalize('  doc. Mgr. Jan Outrata, Ph.D.'));
        $this->assertSame('radim belohlavek', PersonNames::normalize('prof. RNDr. Radim  Bělohlávek, Ph.D., DSc.'));
        $this->assertSame(
            PersonNames::normalize('prof. RNDr. Radim Bělohlávek, DSc.'),
            PersonNames::normalize('prof. RNDr. Radim Bělohlávek, Ph.D., DSc.'),
        );
    }

    public function test_display_name_and_surname(): void
    {
        $this->assertSame('Miroslav Kolařík', PersonNames::displayName('doc. RNDr. Miroslav Kolařík, Ph.D.'));
        $this->assertSame('Kolařík', PersonNames::surname('doc. RNDr. Miroslav Kolařík, Ph.D.'));
    }
}
